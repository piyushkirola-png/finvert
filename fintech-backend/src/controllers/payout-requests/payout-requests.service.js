const {
  Prisma,
  PayOutRequestStatus,
  TransactionType,
  WebhookEventType,
} = require("@prisma/client");
const axios = require("axios");
const prisma = require("../../../config/prisma");
const { encrypt, decrypt } = require("../../utils/encryption.util");
const auditLogService = require("../../services/audit-log.service");

// INTEGRATION IMPORTS
const fiatPayPayoutIntegration = require("./IntegrationServices/FiatPayIntegration/FiatPayIntegrationService.service");
const dummyPayoutIntegration = require("./IntegrationServices/DummyIntegration/DummyIntegrationService.service");

// ERROR CLASSIFICATION CONSTANTS
const BUSINESS_ERRORS = [
  "INVALID_API_KEY",
  "INVALID_CLIENT_ID",
  "INVALID_SECRET",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_REQUEST",
  "MISSING_PARAMETER",
  "INVALID_PARAMETER",
  "INVALID_AMOUNT",
  "INVALID_CURRENCY",
  "INVALID_PHONE",
  "INVALID_EMAIL",
  "INSUFFICIENT_BALANCE",
  "CARD_BLOCKED",
  "TRANSACTION_LIMIT_EXCEEDED",
  "DAILY_LIMIT_EXCEEDED",
  "DUPLICATE_ORDER",
  "DUPLICATE_TRANSACTION",
  "MERCHANT_NOT_ACTIVE",
  "GATEWAY_NOT_CONFIGURED",
  "INVALID_MERCHANT_CONFIG",
  "PAYMENT_MODE_NOT_SUPPORTED",
  "404",
  "400",
  "401",
  "403",
];

const TECHNICAL_ERRORS = [
  "CONNECTION_TIMEOUT",
  "NETWORK_ERROR",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "BAD_GATEWAY",
  "RATE_LIMITED",
  "TOO_MANY_REQUESTS",
  "GATEWAY_DOWN",
  "MAINTENANCE_MODE",
  "SSL_ERROR",
  "502",
  "503",
  "504",
  "429",
  "500",
];

// The gateway definitely did NOT accept the payout -> safe to retry the same gateway.
const SAFE_TO_RETRY_CODES = new Set([
  "RATE_LIMITED",
  "TOO_MANY_REQUESTS",
  "429",
  "503",
  "SERVICE_UNAVAILABLE",
  "MAINTENANCE_MODE",
  "GATEWAY_DOWN",
  "ECONNREFUSED",
  "ENOTFOUND",
]);

// The gateway MAY have accepted the payout (timeout / dropped connection / 5xx):
// never retry, never fail over, never refund. Keep PENDING and confirm status.
const AMBIGUOUS_CODES = new Set([
  "CONNECTION_TIMEOUT",
  "GATEWAY_TIMEOUT",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNABORTED",
  "NETWORK_ERROR",
  "BAD_GATEWAY",
  "INTERNAL_SERVER_ERROR",
  "SSL_ERROR",
  "500",
  "502",
  "504",
]);
const AMBIGUOUS_TEXT =
  /timeout|timed out|etimedout|econnreset|econnaborted|socket hang up|network error|status code (500|502|504)/i;

// SMALL HELPERS
const D = (value) =>
  new Prisma.Decimal(value === null || value === undefined ? 0 : value);
const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const jsonOrUndefined = (v) => (v === null || v === undefined ? undefined : v);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const maskAccount = (value) => {
  if (!value) return null;
  const s = String(value);
  return s.length <= 4 ? "XXXX" : "X".repeat(s.length - 4) + s.slice(-4);
};
const safeDecrypt = (value, fallbackToRaw = false) => {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return fallbackToRaw ? value : null;
  }
};

class PayoutBusinessError extends Error {}

class PayoutRequestsService {
  // 1. CREATE PAYOUT REQUEST
  async create(createPayoutRequestDto, requestMetadata, currentUser) {
    if (!currentUser) {
      throw new Error("User not found");
    }

    if (!currentUser.merchantId) {
      throw new Error(
        "User not mapped to any merchant. Please contact support",
      );
    }

    const amount = Number(createPayoutRequestDto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new PayoutBusinessError("Amount must be greater than 0");
    }
    if (!createPayoutRequestDto.merchantReference) {
      throw new PayoutBusinessError("merchantReference is required");
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: currentUser.merchantId },
    });

    if (!merchant) {
      throw new Error("Merchant not found. Please contact support");
    }

    if (!merchant.isActive) {
      throw new Error("Merchant is not active");
    }

    const idempotencyKey =
      createPayoutRequestDto.idempotencyKey ||
      createPayoutRequestDto.metadata?.idempotencyKey;

    // ========== GET MERCHANT GATEWAY + PRICING ==========
    const merchantRate = await prisma.merchantRate.findFirst({
      where: {
        merchantId: currentUser.merchantId,
        rateDirection: "PAY_OUT",
        isActive: true,
        minAmount: { lte: amount },
        maxAmount: { gte: amount },
      },
    });

    if (!merchantRate || !merchantRate.gatewayId) {
      throw new Error(
        "No payout gateway configured for this merchant. Please contact support.",
      );
    }

    const selectedGateway = await prisma.gateway.findUnique({
      where: { id: merchantRate.gatewayId },
    });

    if (!selectedGateway) {
      throw new Error("No gateway found. Please contact support");
    }

    // ========== CALCULATE FEES (Decimal, never float) ==========
    const amountD = D(amount);
    const merchantFee = (
      merchantRate.rateType === "FIXED"
        ? D(merchantRate.rateValue)
        : amountD.mul(D(merchantRate.rateValue)).div(100)
    ).toDecimalPlaces(2);
    const merchantTax = merchantFee
      .mul(D(merchantRate.taxRate))
      .div(100)
      .toDecimalPlaces(2);
    const amountToDebit = amountD.plus(merchantFee).plus(merchantTax);

    const beneficiary = createPayoutRequestDto.beneficiary || {};

    const payoutRequestData = {
      merchantId: merchant.id,
      userId: currentUser.id,
      gatewayId: selectedGateway.id,
      amount: amountD,
      status: PayOutRequestStatus.PENDING,
      merchantReference: createPayoutRequestDto.merchantReference,
      gatewayReference: null,
      paymentMode: createPayoutRequestDto.paymentMode || "BANK",
      beneficiaryName: beneficiary.name || null,
      beneficiaryAccount:
        beneficiary.accountNumber || beneficiary.account
          ? encrypt(beneficiary.accountNumber || beneficiary.account)
          : null,
      beneficiaryBank:
        beneficiary.bankName || beneficiary.bank
          ? encrypt(beneficiary.bankName || beneficiary.bank)
          : null,
      beneficiaryIfsc: beneficiary.ifsc ? encrypt(beneficiary.ifsc) : null,
      requestedAt: new Date(),
      processedAt: null,
      completedAt: null,
      expiresAt: null,
      gatewayRate: merchantRate.rateValue,
      merchantRate: merchantRate.rateValue || 0,
      taxRate: merchantRate.taxRate || 0,
      taxAmount: merchantTax,
      feeType: merchantRate.rateType || "PERCENTAGE",
      feeRate: merchantRate.rateValue || 0,
      feeAmount: merchantFee,
      amountToDebit: amountToDebit,
      gatewayAmount: amountToDebit,
      platformProfit: 0,
      ipAddress: requestMetadata?.ipAddress || null,
      userAgent: requestMetadata?.userAgent || null,
      deviceId: requestMetadata?.deviceId || null,
      geolocation: requestMetadata?.geolocation || null,
      notes: createPayoutRequestDto.notes || null,
      metadata: idempotencyKey ? { idempotencyKey } : {},
      callbackNeeded: true,
      callbackReceived: false,
      createdBy: currentUser.id.toString(),
      retryCount: 0,
      maxRetries: 3,
    };

    // ========== ONE LOCKED TRANSACTION: idempotency + balance + row + HOLD ==========
    let pendingPayoutRequest;
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          await this._lockWallet(tx, merchant.id, currentUser.id);

          if (idempotencyKey) {
            const existing = await tx.payOutRequest.findFirst({
              where: {
                merchantId: merchant.id,
                metadata: { path: ["idempotencyKey"], equals: idempotencyKey },
              },
            });
            if (existing) return { existing };
          }

          await this._assertBalance(
            tx,
            merchant.id,
            currentUser.id,
            amountToDebit,
            merchant.payOutLien,
          );

          const request = await tx.payOutRequest.create({
            data: payoutRequestData,
          });

          const { entry } = await this._postWalletEntry(tx, {
            merchantId: merchant.id,
            userId: currentUser.id,
            amount: amountToDebit,
            type: TransactionType.DEBIT,
            description: `Payout hold - ${request.merchantReference}`,
            transactionId: this._holdId(request),
          });

          const linked = await tx.payOutRequest.update({
            where: { id: request.id },
            data: { payOutWalletTransactionId: entry.id },
          });

          await this.updateWalletSummary(merchant.id, currentUser.id, tx);
          return { request: linked };
        },
        { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 10000 },
      );

      if (outcome.existing) {
        console.log(
          `[Idempotency] Duplicate payout request detected: ${idempotencyKey}`,
        );
        return {
          ...outcome.existing,
          idempotent: true,
          message: "Duplicate request - returning existing result",
        };
      }
      pendingPayoutRequest = outcome.request;
    } catch (error) {
      if (error.code === "P2002") {
        throw new Error("Duplicate merchant reference");
      }
      if (error instanceof PayoutBusinessError) {
        throw error;
      }
      console.error("Failed to create payout request:", error);
      throw new Error("Failed to create payout request");
    }

    await this._audit(
      currentUser.id,
      currentUser.merchantId,
      pendingPayoutRequest,
      "CREATED",
      { merchantReference: pendingPayoutRequest.merchantReference },
    );

    return this._dispatchAndSettle(pendingPayoutRequest, beneficiary, {
      paymentMode: createPayoutRequestDto.paymentMode || "BANK",
    });
  }

  // 1b. SEND TO GATEWAY + SETTLE (shared by create() and retry())
  async _dispatchAndSettle(
    request,
    beneficiary,
    { paymentMode = "BANK" } = {},
  ) {
    let integrationResponse;
    try {
      integrationResponse = await this.initiateWithRetry(
        {
          amount: Number(request.amount),
          merchantReference: request.merchantReference,
          beneficiary,
          gatewayId: request.gatewayId,
          paymentMode,
          id: request.id,
          merchantId: request.merchantId,
          idempotencyKey: this._gatewayIdempotencyKey(request),
        },
        3,
      );
    } catch (error) {
      console.error(`[Payout] Failed to initiate payout:`, error.message);
      integrationResponse = error.result
        ? { ...error.result }
        : {
            status: PayOutRequestStatus.FAILED,
            vendorReference: null,
            bankTransactionId: null,
            vendorRequest: null,
            vendorResponse: null,
            failureReason: error.message,
            failureCode: "GATEWAY_ERROR",
            notes: "Integration failed",
            metadata: {},
            callbackNeeded: false,
          };
    }

    const { status, ...integrationData } = integrationResponse;
    const ambiguous = integrationResponse.ambiguous === true;

    const latest = await prisma.payOutRequest.findUnique({
      where: { id: request.id },
      select: { metadata: true },
    });
    const metadata = {
      ...(isPlainObject(latest?.metadata) ? latest.metadata : {}),
      ...(isPlainObject(integrationData.metadata)
        ? integrationData.metadata
        : {}),
    };
    if (ambiguous) metadata.needsStatusCheck = true;

    await prisma.payOutRequest.update({
      where: { id: request.id },
      data: {
        gatewayId: integrationData.gatewayId || request.gatewayId,
        gatewayReference:
          integrationData.vendorReference ||
          integrationData.bankTransactionId ||
          undefined,
        requestLog: jsonOrUndefined(integrationData.vendorRequest),
        responseLog: jsonOrUndefined(integrationData.vendorResponse),
        callbackNeeded: ambiguous
          ? true
          : Boolean(integrationData.callbackNeeded),
        metadata,
        failureReason:
          status === PayOutRequestStatus.FAILED
            ? integrationData.failureReason || null
            : null,
        failureCode:
          status === PayOutRequestStatus.FAILED
            ? integrationData.failureCode || null
            : null,
      },
    });

    try {
      if (status === PayOutRequestStatus.COMPLETED) {
        await this.onPayoutRequestCompleted(request, {
          utr: metadata.utr || integrationData.utr || null,
        });
      } else if (status === PayOutRequestStatus.FAILED) {
        await this.onPayoutRequestFailed(request, {
          failureReason: integrationData.failureReason,
          failureCode: integrationData.failureCode,
        });
      }
    } catch (settleError) {
      console.error(
        `[Payout] Settle failed for request ${request.id}:`,
        settleError.message,
      );
      await prisma.payOutRequest
        .update({
          where: { id: request.id },
          data: { metadata: { ...metadata, needsStatusCheck: true } },
        })
        .catch(() => {});
    }

    return prisma.payOutRequest.findUnique({ where: { id: request.id } });
  }

  // 2. RETRY LOGIC (single payout attempt with safe retries)
  async initiateWithRetry(payoutData, maxRetriesPerGateway = 3) {
    let lastResult = null;
    let gatewayId = payoutData.gatewayId;

    for (let attempt = 1; attempt <= maxRetriesPerGateway; attempt++) {
      console.log(
        `[Payout Retry] Gateway ${gatewayId}, Attempt ${attempt}/${maxRetriesPerGateway}`,
      );

      let result;
      try {
        result = await this.callGatewayIntegration({
          ...payoutData,
          gatewayId,
        });
      } catch (error) {
        result = {
          status: PayOutRequestStatus.FAILED,
          failureReason: error.message,
          failureCode: error.code ? String(error.code) : "GATEWAY_ERROR",
          vendorResponse: error.message,
        };
      }

      // Accepted by the gateway (PENDING / COMPLETED)
      if (result && result.status !== PayOutRequestStatus.FAILED) {
        return { ...result, gatewayId };
      }

      lastResult = {
        ...(result || {}),
        status: PayOutRequestStatus.FAILED,
        gatewayId,
      };

      if (this.isAmbiguousFailure(lastResult)) {
        console.warn(
          `[Payout] Ambiguous failure on gateway ${gatewayId}, keeping PENDING`,
        );
        return {
          ...lastResult,
          status: PayOutRequestStatus.PENDING,
          ambiguous: true,
        };
      }

      // Gateway clearly did not accept (rate limit / maintenance): retry with backoff.
      if (
        this.isSafeToRetry(lastResult.failureCode) &&
        attempt < maxRetriesPerGateway
      ) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      // Business / definitive error: retrying will not help.
      break;
    }

    const error = new Error(
      `Gateway failed. Last error: ${lastResult?.failureReason || "Unknown error"}`,
    );
    error.result = lastResult;
    throw error;
  }

  // 3. ERROR CLASSIFICATION
  isBusinessError(errorCode) {
    if (!errorCode) return false;
    const code = String(errorCode).toUpperCase();
    return BUSINESS_ERRORS.some((err) => code.includes(err) || code === err);
  }

  isTechnicalError(errorCode) {
    if (!errorCode) return false;
    const code = String(errorCode).toUpperCase();
    return TECHNICAL_ERRORS.some((err) => code.includes(err) || code === err);
  }

  isSafeToRetry(errorCode) {
    if (!errorCode) return false;
    return SAFE_TO_RETRY_CODES.has(String(errorCode).toUpperCase());
  }

  // True when we cannot tell whether the gateway sent the money.
  isAmbiguousFailure(result) {
    if (!result) return false;
    if (result.ambiguous === true) return true;
    const code = String(result.failureCode || "").toUpperCase();
    if (code && AMBIGUOUS_CODES.has(code)) return true;
    const text = `${result.failureReason || ""} ${
      typeof result.vendorResponse === "string" ? result.vendorResponse : ""
    }`;
    return AMBIGUOUS_TEXT.test(text);
  }

  // 4. CALL GATEWAY INTEGRATION
  async callGatewayIntegration(payoutData) {
    const gatewayId = payoutData.gatewayId;
    const amount = Number(payoutData.amount);
    const merchantReference = payoutData.merchantReference;
    const beneficiary = payoutData.beneficiary || {};
    const options = { idempotencyKey: payoutData.idempotencyKey };

    switch (gatewayId) {
      case 1: // FiatPay
        return await fiatPayPayoutIntegration.initiatePayOutRequest(
          amount,
          merchantReference,
          {
            name: beneficiary.name || "",
            accountNumber: String(
              beneficiary.accountNumber || beneficiary.account || "",
            ),
            ifsc: beneficiary.ifsc || "",
            bankName: String(beneficiary.bankName || beneficiary.bank || ""),
            email: beneficiary.email || "test@example.com",
            mobile: beneficiary.mobile || "9876543210",
          },
          options,
        );
      case 19: // Dummy
        return await dummyPayoutIntegration.initiatePayOutRequest(
          amount,
          merchantReference,
          {
            name: beneficiary.name || "",
            accountNumber: String(
              beneficiary.accountNumber || beneficiary.account || "",
            ),
            ifsc: beneficiary.ifsc || "",
            bankName: String(beneficiary.bankName || beneficiary.bank || ""),
            email: beneficiary.email || "test@example.com",
            mobile: beneficiary.mobile || "9876543210",
          },
          options,
        );
      default:
        throw new Error(`No integration found for gateway ID: ${gatewayId}`);
    }
  }

  _holdId(request) {
    return request.retryCount
      ? `${request.id}-R${request.retryCount}`
      : `${request.id}`;
  }

  _refundId(request) {
    return `PAYOUT-${request.id}-REFUND`;
  }

  // Key sent to the gateway (dynamic from request id + retryCount)
  _gatewayIdempotencyKey(request) {
    return `PO-${request.id}-A${request.retryCount || 0}`;
  }

  // Per-(merchant,user) advisory lock
  async _lockWallet(tx, merchantId, userId) {
    const lockKey = BigInt(merchantId) * 1000000n + BigInt(userId ?? 0);
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock($1::bigint)`,
      lockKey.toString(),
    );
  }

  async _getLastWallet(tx, merchantId, userId) {
    const rows = await tx.$queryRaw`
      SELECT * FROM "PayOutWallet"
      WHERE "merchantId" = ${merchantId}
        AND "userId" = ${userId}
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `;
    return rows[0] || null;
  }

  async _assertBalance(tx, merchantId, userId, required, lien) {
    const last = await this._getLastWallet(tx, merchantId, userId);
    const available = D(last?.closingBalance).minus(D(lien));
    const need = D(required);
    if (available.lt(need)) {
      throw new PayoutBusinessError(
        `Insufficient balance. Available: ${available.toFixed(2)}, Required: ${need.toFixed(2)}`,
      );
    }
    return last;
  }

  // Append one ledger row
  async _postWalletEntry(
    tx,
    {
      merchantId,
      userId,
      amount,
      type,
      description,
      transactionId,
      referenceId = null,
      allowNegative = false,
    },
  ) {
    await this._lockWallet(tx, merchantId, userId);

    const existing = await tx.payOutWallet.findFirst({
      where: { merchantId, transactionId },
    });
    if (existing) {
      return { entry: existing, created: false };
    }

    const last = await this._getLastWallet(tx, merchantId, userId);
    const opening = D(last?.closingBalance);
    const value = D(amount);
    const closing =
      type === TransactionType.CREDIT
        ? opening.plus(value)
        : opening.minus(value);

    if (type === TransactionType.DEBIT && !allowNegative && closing.lt(0)) {
      throw new PayoutBusinessError("Insufficient balance");
    }

    const entry = await tx.payOutWallet.create({
      data: {
        merchantId,
        userId,
        amount: value,
        type,
        description,
        transactionId,
        referenceId,
        transactionDate: new Date(),
        openingBalance: opening,
        closingBalance: closing,
      },
    });
    return { entry, created: true };
  }

  // Lock the wallet, then read the request
  async _lockAndLoad(tx, id) {
    const head = await tx.payOutRequest.findUnique({
      where: { id },
      select: { merchantId: true, userId: true },
    });
    if (!head) {
      throw new Error("Payout request not found");
    }
    await this._lockWallet(tx, head.merchantId, head.userId);
    return tx.payOutRequest.findUnique({ where: { id } });
  }

  _findHoldEntry(tx, request) {
    const ids = [this._holdId(request)];
    // Rows created before this fix debited the wallet with the plain request id.
    if (!request.retryCount) ids.push(String(request.id));
    return tx.payOutWallet.findFirst({
      where: { merchantId: request.merchantId, transactionId: { in: ids } },
    });
  }

  _findRefundEntry(tx, request) {
    return tx.payOutWallet.findFirst({
      where: {
        merchantId: request.merchantId,
        transactionId: this._refundId(request),
      },
    });
  }

  async _runWithConflictRetry(fn, attempts = 3) {
    let lastError;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const retriable =
          error.code === "P2034" ||
          error.message?.includes("write conflict") ||
          error.message?.includes("deadlock");
        if (!retriable || i === attempts) throw error;
        console.log(
          `[Retry] Wallet transaction conflict, retrying in ${i * 300}ms`,
        );
        await sleep(i * 300);
      }
    }
    throw lastError;
  }

  async _audit(userId, merchantId, request, action, details) {
    try {
      await auditLogService.logPayOutRequest(
        userId,
        merchantId,
        request.id,
        request.amount,
        action,
        details,
      );
    } catch (error) {
      console.error(`[Audit] ${action} log failed:`, error.message);
    }
  }

  // Merchant webhook in the background
  _notifyMerchant(request) {
    this.sendMerchantWebhookWithRetry(request).catch((error) =>
      console.error("[Webhook] Merchant notification failed:", error.message),
    );
  }

  // 5. ON PAYOUT REQUEST COMPLETED
  async onPayoutRequestCompleted(payoutRequestData, completionData = {}) {
    const { updated, changed } = await this._runWithConflictRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const request = await this._lockAndLoad(tx, payoutRequestData.id);

          // Duplicate webhook / already completed: do nothing.
          if (request.status === PayOutRequestStatus.COMPLETED) {
            return { updated: request, changed: false };
          }

          const holdEntry = await this._findHoldEntry(tx, request);
          const refundEntry = await this._findRefundEntry(tx, request);
          const debitAmount = request.amountToDebit ?? request.amount;
          let walletLinkId = request.payOutWalletTransactionId;

          if (!holdEntry) {
            const { entry } = await this._postWalletEntry(tx, {
              merchantId: request.merchantId,
              userId: request.userId,
              amount: debitAmount,
              type: TransactionType.DEBIT,
              description: `Payout request completed - ${request.merchantReference}`,
              transactionId: this._holdId(request),
              referenceId: String(request.id),
              allowNegative: true,
            });
            walletLinkId = entry.id;
          } else if (refundEntry) {
            await this._postWalletEntry(tx, {
              merchantId: request.merchantId,
              userId: request.userId,
              amount: debitAmount,
              type: TransactionType.DEBIT,
              description: `Payout completed after refund - ${request.merchantReference}`,
              transactionId: `${this._holdId(request)}-REDEBIT`,
              eferenceId: String(request.id),
              allowNegative: true,
            });
          }

          const metadata = {
            ...(isPlainObject(request.metadata) ? request.metadata : {}),
            ...(isPlainObject(completionData.metadata)
              ? completionData.metadata
              : {}),
          };
          if (completionData.utr) metadata.utr = completionData.utr;
          delete metadata.needsStatusCheck;

          const data = {
            status: PayOutRequestStatus.COMPLETED,
            processedAt: request.processedAt || new Date(),
            completedAt: new Date(),
            callbackReceived: true,
            callbackReceivedAt: new Date(),
            failureReason: null,
            failureCode: null,
            metadata,
          };
          if (
            walletLinkId &&
            walletLinkId !== request.payOutWalletTransactionId
          ) {
            data.payOutWalletTransactionId = walletLinkId;
          }

          const done = await tx.payOutRequest.update({
            where: { id: request.id },
            data,
          });

          await this.updateWalletSummary(
            request.merchantId,
            request.userId,
            tx,
          );
          return { updated: done, changed: true };
        },
        { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 10000 },
      ),
    );

    if (changed) {
      this._notifyMerchant(updated);
      await this._audit(
        updated.userId,
        updated.merchantId,
        updated,
        "COMPLETED",
        { amountToDebit: updated.amountToDebit },
      );
    }

    return updated;
  }

  // 6. ON PAYOUT REQUEST FAILED
  async onPayoutRequestFailed(payoutRequestData, failureInfo = {}) {
    const { updated, changed } = await this._runWithConflictRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const request = await this._lockAndLoad(tx, payoutRequestData.id);

          if (request.status === PayOutRequestStatus.FAILED) {
            return { updated: request, changed: false };
          }

          const holdEntry = await this._findHoldEntry(tx, request);
          const refundEntry = await this._findRefundEntry(tx, request);

          if (holdEntry && !refundEntry) {
            await this._postWalletEntry(tx, {
              merchantId: request.merchantId,
              userId: request.userId,
              amount: request.amountToDebit ?? request.amount,
              type: TransactionType.CREDIT,
              description: `Payout request failed - ${request.merchantReference}`,
              transactionId: this._refundId(request),
              referenceId: String(request.id),
            });
          }

          const metadata = {
            ...(isPlainObject(request.metadata) ? request.metadata : {}),
          };
          delete metadata.needsStatusCheck;

          const failed = await tx.payOutRequest.update({
            where: { id: request.id },
            data: {
              status: PayOutRequestStatus.FAILED,
              processedAt: request.processedAt || new Date(),
              completedAt: new Date(),
              callbackReceived: true,
              callbackReceivedAt: new Date(),
              failureReason:
                failureInfo.failureReason ?? request.failureReason ?? null,
              failureCode:
                failureInfo.failureCode ?? request.failureCode ?? null,
              metadata,
            },
          });

          await this.updateWalletSummary(
            request.merchantId,
            request.userId,
            tx,
          );
          return { updated: failed, changed: true };
        },
        { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 10000 },
      ),
    );

    if (changed) {
      this._notifyMerchant(updated);
      await this._audit(updated.userId, updated.merchantId, updated, "FAILED", {
        failureReason: updated.failureReason,
        failureCode: updated.failureCode,
      });
    }

    return updated;
  }

  // 7. UPDATE WALLET SUMMARY
  async updateWalletSummary(merchantId, userId, tx) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const totalsSince = async (since) => {
      const r = await tx.payOutRequest.aggregate({
        where: {
          merchantId,
          userId,
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        _sum: { amount: true, feeAmount: true, taxAmount: true },
      });
      const fee = D(r._sum.feeAmount);
      const tax = D(r._sum.taxAmount);
      return {
        out: D(r._sum.amount).plus(fee).plus(tax).toNumber(),
        charges: fee.plus(tax).toNumber(),
      };
    };

    const day = await totalsSince(startOfDay);
    const week = await totalsSince(startOfWeek);
    const month = await totalsSince(startOfMonth);
    const year = await totalsSince(startOfYear);

    const completedToday = await tx.payOutRequest.count({
      where: {
        merchantId,
        userId,
        status: "COMPLETED",
        completedAt: { gte: startOfDay },
      },
    });

    const failedToday = await tx.payOutRequest.count({
      where: {
        merchantId,
        userId,
        status: "FAILED",
        completedAt: { gte: startOfDay },
      },
    });

    const pendingToday = await tx.payOutRequest.count({
      where: {
        merchantId,
        userId,
        status: "PENDING",
        requestedAt: { gte: startOfDay },
      },
    });

    const lastWallet = await tx.payOutWallet.findFirst({
      where: { merchantId, userId },
      orderBy: { id: "desc" },
    });

    const values = {
      closingBalance: lastWallet ? lastWallet.closingBalance : 0,
      totalOutToday: day.out,
      totalOutThisWeek: week.out,
      totalOutThisMonth: month.out,
      totalOutThisYear: year.out,
      successfulPayOuts: completedToday,
      failedPayOuts: failedToday,
      pendingPayOuts: pendingToday,
      totalPayOuts: completedToday + failedToday + pendingToday,
      netChargesToday: day.charges,
      netChargesThisWeek: week.charges,
      netChargesThisMonth: month.charges,
      netChargesThisYear: year.charges,
      lastTransactionProcessed: lastWallet?.id?.toString() || "",
    };

    await tx.payOutWalletSummary.upsert({
      where: {
        merchantId_userId: { merchantId, userId },
      },
      update: { ...values, updatedAt: new Date() },
      create: { merchantId, userId, ...values },
    });
  }

  // 8. SEND WEBHOOK WITH RETRY
  async sendMerchantWebhookWithRetry(payoutRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: payoutRequest.merchantId },
      });

      if (!merchant?.webhookUrl) {
        return;
      }

      const metadata = isPlainObject(payoutRequest.metadata)
        ? payoutRequest.metadata
        : {};

      const webhookData = {
        event: "PAY_OUT_STATUS_UPDATE",
        data: {
          id: payoutRequest.id,
          merchantReference: payoutRequest.merchantReference,
          status: payoutRequest.status,
          amount: Number(payoutRequest.amount),
          amountToDebit: Number(
            payoutRequest.amountToDebit || payoutRequest.amount,
          ),
          utr: metadata.utr || null,
          completedAt: payoutRequest.completedAt,
          failureReason: payoutRequest.failureReason,
          failureCode: payoutRequest.failureCode,
          beneficiary: {
            name: payoutRequest.beneficiaryName,
            account: maskAccount(safeDecrypt(payoutRequest.beneficiaryAccount)),
            bank: safeDecrypt(payoutRequest.beneficiaryBank),
            ifsc: safeDecrypt(payoutRequest.beneficiaryIfsc),
          },
        },
        timestamp: new Date().toISOString(),
      };

      const log = await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          gatewayId: payoutRequest.gatewayId,
          eventType: WebhookEventType.PAY_OUT_STATUS_UPDATE,
          requestBody: webhookData,
          status: "PENDING",
          amount: payoutRequest.amount,
          utr: metadata.utr || null,
        },
      });

      await this.sendWebhookWithRetry(
        merchant.webhookUrl,
        webhookData,
        log.id,
        3,
      );
    } catch (error) {
      console.error("Error sending merchant webhook:", error);
    }
  }

  // 9. SEND WEBHOOK WITH RETRY MECHANISM
  async sendWebhookWithRetry(url, data, logId, maxRetries = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.log(
          `[Webhook Retry] Attempt ${attempt}/${maxRetries} for log ${logId}`,
        );

        const response = await axios.post(url, data, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        await prisma.outboundLog.update({
          where: { id: logId },
          data: {
            status: "SUCCESS",
            responseStatus: response.status,
            responseBody: response.data,
            processedAt: new Date(),
          },
        });

        console.log(`[Webhook] Success for log ${logId}`);
        return { success: true };
      } catch (error) {
        lastError = error;
        console.error(
          `[Webhook Retry] Attempt ${attempt} failed:`,
          error.message,
        );

        await prisma.outboundLog.update({
          where: { id: logId },
          data: {
            status: attempt >= maxRetries ? "FAILED" : "PENDING",
            responseStatus: error.response?.status || 500,
            responseBody: error.response?.data || error.message,
            processedAt: attempt >= maxRetries ? new Date() : null,
          },
        });

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000;
          console.log(
            `[Webhook Retry] Waiting ${delay}ms before retry ${attempt + 1}`,
          );
          await sleep(delay);
        }
      }
    }

    console.error(
      `[Webhook Retry] All ${maxRetries} attempts failed for log ${logId}`,
    );
    return { success: false, error: lastError };
  }

  // 10. FIND ALL PAYOUT REQUESTS
  async findAll(pagination, user, startDate, endDate, filterOptions = {}) {
    const where = {};

    if (
      user &&
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN" &&
      user.merchantId
    ) {
      where.merchantId = user.merchantId;
      where.userId = user.id;
    }

    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = startDate;
      if (endDate) where.requestedAt.lte = endDate;
    }

    if (filterOptions.gatewayId)
      where.gatewayId = parseInt(filterOptions.gatewayId);
    if (filterOptions.merchantId)
      where.merchantId = parseInt(filterOptions.merchantId);
    if (filterOptions.userId) where.userId = parseInt(filterOptions.userId);
    if (filterOptions.status) where.status = filterOptions.status;
    if (filterOptions.search) {
      where.OR = [
        {
          merchantReference: {
            contains: filterOptions.search,
            mode: "insensitive",
          },
        },
        {
          beneficiaryName: {
            contains: filterOptions.search,
            mode: "insensitive",
          },
        },
        {
          beneficiaryAccount: {
            contains: filterOptions.search,
            mode: "insensitive",
          },
        },
        {
          beneficiaryBank: {
            contains: filterOptions.search,
            mode: "insensitive",
          },
        },
      ];
    }
    if (filterOptions.amountMin || filterOptions.amountMax) {
      where.amount = {};
      if (filterOptions.amountMin)
        where.amount.gte = parseFloat(filterOptions.amountMin);
      if (filterOptions.amountMax)
        where.amount.lte = parseFloat(filterOptions.amountMax);
    }

    if (filterOptions.paymentMode) {
      where.paymentMode = filterOptions.paymentMode;
    }

    if (filterOptions.feeType) {
      where.feeType = filterOptions.feeType;
    }

    // ADD THIS BLOCK FOR UTR FILTER
    if (filterOptions.utr) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { metadata: { path: ["utr"], string_contains: filterOptions.utr } },
            { metadata: { path: ["rawPayload", "utr"], string_contains: filterOptions.utr } }
          ]
        }
      ];
    }

    const orderBy = filterOptions?.sorts || { requestedAt: "desc" };

    const [total, payoutRequests] = await Promise.all([
      prisma.payOutRequest.count({ where }),
      prisma.payOutRequest.findMany({
        where,
        orderBy,
        skip: pagination?.offset || 0,
        take: pagination?.limit || 10,
        include: {
          merchant: {
            select: { id: true, name: true, email: true },
          },
          gateway: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const decryptedPayouts = payoutRequests.map((payout) => ({
      ...payout,
      beneficiaryAccount: payout.beneficiaryAccount
        ? decrypt(payout.beneficiaryAccount)
        : null,
      beneficiaryBank: payout.beneficiaryBank
        ? decrypt(payout.beneficiaryBank)
        : null,
      beneficiaryIfsc: payout.beneficiaryIfsc
        ? decrypt(payout.beneficiaryIfsc)
        : null,
    }));

    return { payoutRequests: decryptedPayouts, total };
  }

  // 11. FIND ONE PAYOUT REQUEST
  async findOne(id) {
    const payoutRequest = await prisma.payOutRequest.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { id: true, name: true, email: true },
        },
        gateway: {
          select: { id: true, name: true },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!payoutRequest) {
      throw new Error("Payout request not found");
    }

    const decryptIfEncrypted = (value) => {
      if (!value) return null;
      if (typeof value !== "string") return null;

      if (value.includes(":") && value.length > 40) {
        try {
          return decrypt(value);
        } catch {
          return null;
        }
      }

      return value;
    };

    return {
      ...payoutRequest,
      beneficiaryAccount: decryptIfEncrypted(payoutRequest.beneficiaryAccount),
      beneficiaryBank: decryptIfEncrypted(payoutRequest.beneficiaryBank),
      beneficiaryIfsc: decryptIfEncrypted(payoutRequest.beneficiaryIfsc),
    };
  }

  // 12. FIND BY MERCHANT REFERENCE
  async findByMerchantReference(merchantReference) {
    const payoutRequest = await prisma.payOutRequest.findUnique({
      where: { merchantReference },
    });

    if (!payoutRequest) {
      throw new Error("Payout request not found");
    }

    return payoutRequest;
  }

  // 13. UPDATE PAYOUT REQUEST
  async update(id, updateData) {
    const PROTECTED_FIELDS = [
      "id",
      "status",
      "amount",
      "amountToDebit",
      "gatewayAmount",
      "feeAmount",
      "feeRate",
      "feeType",
      "taxAmount",
      "taxRate",
      "platformProfit",
      "merchantId",
      "userId",
      "gatewayId",
      "merchantReference",
      "payOutWalletTransactionId",
      "retryCount",
    ];
    const safeData = { ...updateData };
    for (const field of PROTECTED_FIELDS) delete safeData[field];

    return await prisma.payOutRequest.update({
      where: { id },
      data: safeData,
    });
  }

  // 14. RETRY FAILED PAYOUT: re-holds the funds, then sends again
  async retry(id) {
    const reopened = await this._runWithConflictRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const request = await this._lockAndLoad(tx, id);

          if (request.status !== PayOutRequestStatus.FAILED) {
            throw new Error("Only failed payout requests can be retried");
          }

          if (request.retryCount >= request.maxRetries) {
            throw new Error("Maximum retry limit reached");
          }

          const holdEntry = await this._findHoldEntry(tx, request);
          const refundEntry = await this._findRefundEntry(tx, request);
          if (holdEntry && !refundEntry) {
            throw new Error(
              "Cannot retry: wallet refund for the previous attempt is missing. Reconcile first.",
            );
          }

          const next = { ...request, retryCount: request.retryCount + 1 };
          const merchant = await tx.merchant.findUnique({
            where: { id: request.merchantId },
          });

          await this._assertBalance(
            tx,
            request.merchantId,
            request.userId,
            request.amountToDebit ?? request.amount,
            merchant?.payOutLien,
          );

          const { entry } = await this._postWalletEntry(tx, {
            merchantId: request.merchantId,
            userId: request.userId,
            amount: request.amountToDebit ?? request.amount,
            type: TransactionType.DEBIT,
            description: `Payout retry hold - ${request.merchantReference}`,
            transactionId: this._holdId(next),
            referenceId: String(request.id),
          });

          const updated = await tx.payOutRequest.update({
            where: { id },
            data: {
              status: PayOutRequestStatus.PENDING,
              retryCount: next.retryCount,
              lastRetryAt: new Date(),
              failureReason: null,
              failureCode: null,
              processedAt: null,
              completedAt: null,
              callbackReceived: false,
              callbackReceivedAt: null,
              payOutWalletTransactionId: entry.id,
            },
          });

          await this.updateWalletSummary(
            request.merchantId,
            request.userId,
            tx,
          );
          return updated;
        },
        { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 10000 },
      ),
    );

    const beneficiary = {
      name: reopened.beneficiaryName || "",
      account: safeDecrypt(reopened.beneficiaryAccount, true) || "",
      bank: safeDecrypt(reopened.beneficiaryBank, true) || "",
      ifsc: safeDecrypt(reopened.beneficiaryIfsc, true) || "",
    };

    return this._dispatchAndSettle(reopened, beneficiary, {
      paymentMode: "BANK",
    });
  }

  // 15. PROCESS REFUND WALLET TRANSACTIONS
  async processRefundWalletTransactions(refundId) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { payOutRequest: true },
    });

    if (!refund) {
      throw new Error("Refund not found");
    }

    if (refund.walletDebitTransactionId) {
      console.log(
        `[Refund] Wallet transactions already processed for refund ${refundId}`,
      );
      return refund;
    }

    const userId = refund.payOutRequest?.userId;
    if (!userId) {
      throw new Error("userId is required for refund wallet transactions");
    }

    return await prisma.$transaction(async (tx) => {
      const lockedPayout = await tx.$queryRaw`
        SELECT * FROM "PayOutWallet" 
        WHERE "merchantId" = ${refund.merchantId}
        AND "userId" = ${userId}
        ORDER BY id DESC 
        LIMIT 1 
        FOR UPDATE
      `;
      const lastPayoutWallet = lockedPayout[0];

      const payoutOpeningBalance = lastPayoutWallet?.closingBalance || 0;
      const payoutClosingBalance =
        Number(payoutOpeningBalance) - Number(refund.amount);

      const payoutWalletTx = await tx.payOutWallet.create({
        data: {
          merchantId: refund.merchantId,
          userId: userId,
          amount: refund.amount,
          type: TransactionType.DEBIT,
          description: `Refund - ${refund.payOutRequest?.merchantReference || "Unknown"}`,
          transactionId: refund.id.toString(),
          referenceId: refund.payOutRequestId
            ? String(refund.payOutRequestId)
            : null,
          transactionDate: new Date(),
          openingBalance: payoutOpeningBalance,
          closingBalance: payoutClosingBalance,
        },
      });

      const lockedPayin = await tx.$queryRaw`
        SELECT * FROM "PayInWallet" 
        WHERE "merchantId" = ${refund.merchantId}
        AND "userId" = ${userId}
        ORDER BY id DESC 
        LIMIT 1 
        FOR UPDATE
      `;
      const lastPayinWallet = lockedPayin[0];

      const payinOpeningBalance = lastPayinWallet?.closingBalance || 0;
      const payinClosingBalance =
        Number(payinOpeningBalance) + Number(refund.amount);

      const payinWalletTx = await tx.payInWallet.create({
        data: {
          merchantId: refund.merchantId,
          userId: userId,
          amount: refund.amount,
          type: TransactionType.CREDIT,
          description: `Refund reversed - ${refund.payOutRequest?.merchantReference || "Unknown"}`,
          transactionId: refund.id.toString(),
          transactionDate: new Date(),
          openingBalance: payinOpeningBalance,
          closingBalance: payinClosingBalance,
        },
      });

      await tx.refund.update({
        where: { id: refundId },
        data: {
          walletDebitTransactionId: payoutWalletTx.id,
          walletCreditTransactionId: payinWalletTx.id,
        },
      });

      await this.updateWalletSummary(refund.merchantId, userId, tx);

      console.log(
        `[Refund] Wallet transactions processed for refund ${refundId}`,
      );
      return { payoutWalletTx, payinWalletTx };
    });
  }

  // 16. SEND REFUND COMPLETED NOTIFICATION
  async sendRefundCompletedNotification(refund, payOutRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: refund.merchantId },
      });

      if (!merchant?.webhookUrl) {
        console.log(
          `[Refund] No webhook URL for merchant ${refund.merchantId}`,
        );
        return;
      }

      const webhookData = {
        event: "REFUND_COMPLETED",
        data: {
          id: refund.id,
          payOutRequestId: refund.payOutRequestId,
          merchantReference: payOutRequest?.merchantReference || null,
          amount: Number(refund.amount),
          refundType: refund.refundType,
          status: refund.status,
          completedAt: refund.completedAt,
        },
        timestamp: new Date().toISOString(),
      };

      await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          gatewayId: refund.gatewayId,
          eventType: WebhookEventType.REFUND_COMPLETED,
          requestBody: webhookData,
          status: "PENDING",
          amount: refund.amount,
        },
      });

      axios
        .post(merchant.webhookUrl, webhookData, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        })
        .catch((error) => {
          console.error(`[Refund] Failed to send webhook: ${error.message}`);
        });

      console.log(
        `[Refund] Completed notification sent for refund ${refund.id}`,
      );
    } catch (error) {
      console.error(
        `[Refund] Error sending completed notification: ${error.message}`,
      );
    }
  }
}

module.exports = new PayoutRequestsService();
