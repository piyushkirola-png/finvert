const {
  PayInRequestStatus,
  TransactionType,
  WebhookEventType,
  ChargebackStatus,
  RefundStatus,
} = require("@prisma/client");
const crypto = require("crypto");
const prisma = require("../../../config/prisma");
const auditLogService = require("../../services/audit-log.service");

// Import Forgein Currency Exchange Rates
const paymentOrchestrator = require("./Orchestrator/orchestrator.service");
const riskBlocksService = require("../risk-blocks/risk-blocks.service");
const fxRatesService = require("../fx-rates/fx-rates.service");
const { detectCardNetwork } = require("../../utils/cardNetwork.util");
const { buildMerchantWebhook } = require("../../utils/webhook-formatter");

// Import integrations
const fiatPayIntegration = require("./IntegrationServices/FiatPayIntegration/FiatPayIntegrationService.service");
const airpayPayinIntegration = require("./IntegrationServices/AirpayIntegration/AirpayIntegrationService.service");
const pay10Integration = require("./IntegrationServices/Pay10Integration/Pay10IntegrationService.service");
const dummyPayinIntegration = require("./IntegrationServices/DummyIntegration/DummyIntegrationService.service");

function toAdvisoryKey(label) {
  const hex = crypto
    .createHash("sha256")
    .update(String(label))
    .digest("hex")
    .slice(0, 15);
  return BigInt("0x" + hex).toString();
}

async function withSessionLock(label, fn) {
  const key = toAdvisoryKey(label);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock($1::bigint)`,
        key,
      );
      return fn(tx);
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

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
  "INVALID_CARD",
  "INVALID_UPI_ID",
  "CUSTOMER_DECLINED",
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

class PayInRequestsService {
  /**
   * Create a new pay-in request
   */
  async create(createPayInRequestDto, requestMetadata, currentUser) {
    const cardNetwork = "UNKNOWN";

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (!currentUser.merchantId) {
      throw new Error(
        "User not mapped to any merchant. Please contact support",
      );
    }

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { id: currentUser.merchantId },
    });

    if (!merchant) {
      throw new Error("Merchant not found. Please contact support");
    }

    if (!merchant.isActive) {
      throw new Error("Merchant is not active");
    }

    // Risk block check
    await riskBlocksService.checkPayInRequestBlocked({
      user: currentUser,
      customer: createPayInRequestDto.customer,
      merchantId: currentUser.merchantId,
      vpa: createPayInRequestDto.customer?.vpa,
      deviceId: requestMetadata?.deviceId,
      ipAddress: requestMetadata?.ipAddress,
    });

    // IDEMPOTENCY CHECK
    const idempotencyKey =
      createPayInRequestDto.idempotencyKey ||
      createPayInRequestDto.metadata?.idempotencyKey;

    if (idempotencyKey) {
      const existingRequest = await this.checkIdempotency(
        idempotencyKey,
        currentUser.merchantId,
      );

      if (existingRequest) {
        console.log(
          `[Idempotency] Duplicate request detected: ${idempotencyKey}`,
        );
        return {
          ...existingRequest,
          idempotent: true,
          message: "Duplicate request - returning existing result",
        };
      }
    }

    // USE PAYMENT ORCHESTRATOR FOR GATEWAY ROUTING
    let amountInINR = createPayInRequestDto.amount;
    if (createPayInRequestDto.currency !== "INR") {
      amountInINR = await fxRatesService.convertToINR(
        createPayInRequestDto.amount,
        createPayInRequestDto.currency,
      );
    }

    const selectedGateway = await paymentOrchestrator.decideRoute({
      merchantId: currentUser.merchantId,
      amount: amountInINR,
      paymentMode: createPayInRequestDto.paymentMode || "PG",
      currency: createPayInRequestDto.currency || "INR",
      country: "IN",
      riskLevel: "LOW",
      currentUser: currentUser,
    });

    if (!selectedGateway) {
      throw new Error(
        "No suitable gateway found for this transaction. Please contact support",
      );
    }

    // ========== MERCHANT RATE ==========
    const merchantRateConfig = await prisma.merchantRate.findFirst({
      where: {
        merchantId: currentUser.merchantId,
        gatewayId: selectedGateway.id,
        minAmount: { lte: amountInINR },
        maxAmount: { gte: amountInINR },
        rateDirection: "PAY_IN",
        isActive: true,
      },
    });

    if (!merchantRateConfig) {
      throw new Error("Merchant rate not configured. Please contact support.");
    }

    // ========== CALCULATE MERCHANT FEE ==========
    let merchantFee = 0;
    if (merchantRateConfig.rateType === "FIXED") {
      merchantFee = Number(merchantRateConfig.rateValue);
    } else {
      merchantFee = amountInINR * (Number(merchantRateConfig.rateValue) / 100);
    }

    const merchantTax = (merchantFee * (merchantRateConfig.taxRate || 0)) / 100;
    const merchantAmount = amountInINR - merchantFee - merchantTax;

    // Create pay-in request object
    const payInRequestData = {
      merchantId: merchant.id,
      gatewayId: selectedGateway.id,
      userId: currentUser.id,
      amount: createPayInRequestDto.amount,
      currency: createPayInRequestDto.currency || "INR",
      status: PayInRequestStatus.PENDING,
      merchantReference: createPayInRequestDto.merchantReference,
      gatewayReference: null,
      cardNetwork: cardNetwork,
      customerName: createPayInRequestDto.customer?.name || null,
      customerEmail: createPayInRequestDto.customer?.email || null,
      customerPhone: createPayInRequestDto.customer?.phone || null,
      customerAddress: createPayInRequestDto.customer?.address || null,
      customerPincode: createPayInRequestDto.customer?.pincode || null,
      requestedAt: new Date(),
      processedAt: null,
      completedAt: null,
      expiresAt: null,
      merchantRate: merchantRateConfig.rateValue,
      taxRate: merchantRateConfig.taxRate || 0,
      taxAmount: merchantTax,
      feeType: merchantRateConfig.rateType,
      feeRate: merchantRateConfig.rateValue,
      feeAmount: merchantFee,
      amountToCredit: merchantAmount,
      amountInINR:
        createPayInRequestDto.currency !== "INR" ? amountInINR : null,
      fxRate:
        createPayInRequestDto.currency !== "INR"
          ? await fxRatesService.getRate(createPayInRequestDto.currency)
          : null,
      paymentMode: createPayInRequestDto.paymentMode || "PG",
      ipAddress: requestMetadata?.ipAddress || null,
      userAgent: requestMetadata?.userAgent || null,
      deviceId: requestMetadata?.deviceId || null,
      geolocation: requestMetadata?.geolocation || null,
      notes: createPayInRequestDto.notes || null,
      metadata: createPayInRequestDto.customer || null,
      callbackNeeded: true,
      callbackReceived: false,
      createdBy: currentUser.id.toString(),
      retryCount: 0,
      maxRetries: 3,
    };

    // Store idempotency key in metadata
    if (idempotencyKey) {
      payInRequestData.metadata = {
        ...payInRequestData.metadata,
        idempotencyKey: idempotencyKey,
      };
    }

    // Create pending pay-in request (lock so the same idempotency key cannot insert twice)
    const createPendingRequest = async () => {
      if (idempotencyKey) {
        const existingRequest = await this.checkIdempotency(
          idempotencyKey,
          currentUser.merchantId,
        );
        if (existingRequest) {
          return { existing: existingRequest };
        }
      }

      try {
        const created = await prisma.payInRequest.create({
          data: payInRequestData,
        });

        await auditLogService.logPayInRequest(
          currentUser.id,
          currentUser.merchantId,
          created.id,
          created.amount,
          "CREATED",
          { merchantReference: created.merchantReference },
        );

        return { created };
      } catch (error) {
        if (error.code === "P2002") {
          throw new Error("Duplicate merchant reference");
        }
        console.error("Failed to create pay-in request:", error);
        throw new Error("Failed to create pay-in request");
      }
    };

    const createResult = idempotencyKey
      ? await withSessionLock(
          `payin-idemp:${currentUser.merchantId}:${idempotencyKey}`,
          createPendingRequest,
        )
      : await createPendingRequest();

    if (createResult.existing) {
      console.log(
        `[Idempotency] Duplicate request detected: ${idempotencyKey}`,
      );
      return {
        ...createResult.existing,
        idempotent: true,
        message: "Duplicate request - returning existing result",
      };
    }

    let pendingPayInRequest = createResult.created;

    // Call gateway with retry logic
    let integrationResponse;
    try {
      const retryResult = await this.initiateWithRetry(
        {
          ...pendingPayInRequest,
        },
        3,
      );

      // If retryResult is an error object
      if (retryResult && retryResult.status === PayInRequestStatus.FAILED) {
        throw new Error(retryResult.failureReason || "Gateway failed");
      }

      integrationResponse = retryResult;
    } catch (error) {
      console.error(`Failed to initiate pay-in request:`, error);

      // Log failure through orchestrator
      await paymentOrchestrator.logFailure(
        pendingPayInRequest.id,
        selectedGateway.id,
        {
          code: error.code || "GATEWAY_ERROR",
          message: error.message,
          reason: "Integration failed",
        },
        1,
      );

      await prisma.payInRequest.update({
        where: { id: pendingPayInRequest.id },
        data: {
          status: PayInRequestStatus.FAILED,
          failureReason: error.message,
          processedAt: new Date(),
        },
      });

      throw new Error(`Gateway error: ${error.message}`);
    }

    if (integrationResponse) {
      const { status, cardNetwork, ...integrationData } = integrationResponse;

      // Remove fields that don't exist in schema
      delete integrationData.vendorReference;
      delete integrationData.intentUrl;
      delete integrationData.responseLog;

      const updateData = { ...integrationData };
      if (cardNetwork) {
        updateData.cardNetwork = cardNetwork;
      }

      // Only update if there's data
      if (Object.keys(integrationData).length > 0) {
        await prisma.payInRequest.update({
          where: { id: pendingPayInRequest.id },
          data: updateData,
        });
      }
    }

    // If failed, trigger failure handling
    if (integrationResponse?.status === PayInRequestStatus.FAILED) {
      await this.onPayInRequestFailed(pendingPayInRequest);
    }

    // Return final response
    const finalRequest = await prisma.payInRequest.findUnique({
      where: { id: pendingPayInRequest.id },
    });

    return { ...finalRequest, ...integrationResponse };
  }

  /**
   * Initiate gateway call with retry logic
   */
  async initiateWithRetry(payInRequestData, maxRetriesPerGateway = 3) {
    let lastError = null;
    let triedGateways = new Set();
    let gatewayAttempts = {};
    let currentGatewayId = payInRequestData.gatewayId;
    let attempt = 0;
    const MAX_GATEWAYS = 5;

    while (triedGateways.size < MAX_GATEWAYS) {
      // Track attempts for current gateway
      if (!gatewayAttempts[currentGatewayId]) {
        gatewayAttempts[currentGatewayId] = 0;
      }

      // If current gateway already tried and exhausted, move to next
      if (
        triedGateways.has(currentGatewayId) &&
        gatewayAttempts[currentGatewayId] >= maxRetriesPerGateway
      ) {
        // Get next gateway
        const nextGateway = await this.getNextGateway(
          payInRequestData,
          triedGateways,
        );

        if (!nextGateway) {
          console.log("[Retry] No more gateways available");
          break;
        }

        currentGatewayId = nextGateway.id;
        payInRequestData.gatewayId = currentGatewayId;
        gatewayAttempts[currentGatewayId] = 0;

        // Update database
        await prisma.payInRequest.update({
          where: { id: payInRequestData.id },
          data: {
            gatewayId: currentGatewayId,
            retryCount: gatewayAttempts[currentGatewayId],
          },
        });

        console.log(`[Retry] Switching to gateway: ${currentGatewayId}`);
        continue;
      }

      attempt++;
      gatewayAttempts[currentGatewayId]++;

      try {
        console.log(
          `[Retry] Gateway ${currentGatewayId}, Attempt ${gatewayAttempts[currentGatewayId]}/${maxRetriesPerGateway}`,
        );

        // Call the gateway
        const result = await this.callGatewayIntegration({
          ...payInRequestData,
          gatewayId: currentGatewayId,
        });

        // Check if it's a business error (don't retry)
        if (
          result &&
          result.failureCode &&
          this.isBusinessError(result.failureCode)
        ) {
          console.log(
            `[Retry] Business error: ${result.failureCode}, switching immediately`,
          );
          triedGateways.add(currentGatewayId);

          // Try next gateway
          const nextGateway = await this.getNextGateway(
            payInRequestData,
            triedGateways,
          );

          if (nextGateway) {
            currentGatewayId = nextGateway.id;
            payInRequestData.gatewayId = currentGatewayId;
            gatewayAttempts[currentGatewayId] = 0;

            await prisma.payInRequest.update({
              where: { id: payInRequestData.id },
              data: { gatewayId: currentGatewayId },
            });

            console.log(
              `[Retry] Business error, switched to: ${currentGatewayId}`,
            );
            continue;
          }

          throw new Error(`Business error: ${result.failureReason}`);
        }

        // Check if it's a technical error
        if (result && result.status === PayInRequestStatus.FAILED) {
          const isTechnical =
            result.failureCode && this.isTechnicalError(result.failureCode);

          if (
            isTechnical &&
            gatewayAttempts[currentGatewayId] < maxRetriesPerGateway
          ) {
            console.log(
              `[Retry] Technical error, retrying... (${gatewayAttempts[currentGatewayId]}/${maxRetriesPerGateway})`,
            );
            lastError = result.failureReason || "Technical error";

            // Wait before retry
            const delay = Math.pow(2, gatewayAttempts[currentGatewayId]) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Technical retries exhausted for this gateway
          if (isTechnical) {
            console.log(
              `[Retry] Technical retries exhausted for gateway ${currentGatewayId}`,
            );
            triedGateways.add(currentGatewayId);
            lastError = result.failureReason || "Technical error exhausted";

            // Try next gateway
            const nextGateway = await this.getNextGateway(
              payInRequestData,
              triedGateways,
            );

            if (nextGateway) {
              currentGatewayId = nextGateway.id;
              payInRequestData.gatewayId = currentGatewayId;
              gatewayAttempts[currentGatewayId] = 0;

              await prisma.payInRequest.update({
                where: { id: payInRequestData.id },
                data: { gatewayId: currentGatewayId },
              });

              console.log(
                `[Retry] Technical exhausted, switched to: ${currentGatewayId}`,
              );
              continue;
            }
          }
        }

        // Success!
        if (result && result.status !== PayInRequestStatus.FAILED) {
          console.log(
            `[Retry] SUCCESS on gateway ${currentGatewayId}, attempt ${gatewayAttempts[currentGatewayId]}`,
          );
          return result;
        }

        lastError = result?.failureReason || "Unknown error";
        triedGateways.add(currentGatewayId);
      } catch (error) {
        lastError = error.message;
        console.error(
          `[Retry] Error on gateway ${currentGatewayId}:`,
          error.message,
        );

        // Check if error is business
        if (this.isBusinessError(error.code || error.message)) {
          triedGateways.add(currentGatewayId);
          console.log(`[Retry] Business error, switching immediately`);
          continue;
        }

        triedGateways.add(currentGatewayId);
      }
    }

    // All gateways exhausted
    throw new Error(
      `All gateways failed after ${attempt} attempts. Last error: ${lastError}`,
    );
  }

  /**
   * Get next gateway in priority (excluding failed ones)
   */
  async getNextGateway(payInRequestData, triedGateways) {
    try {
      const user = await prisma.user.findFirst({
        where: { merchantId: payInRequestData.merchantId },
      });

      const gateway = await paymentOrchestrator.decideRoute({
        merchantId: payInRequestData.merchantId,
        amount: payInRequestData.amount,
        paymentMode: payInRequestData.paymentMode,
        currentUser: user || { merchantId: payInRequestData.merchantId },
        excludeGateways: Array.from(triedGateways),
      });

      return gateway;
    } catch (error) {
      console.error("[Retry] Error getting next gateway:", error.message);
      return null;
    }
  }

  /**
   * Check if error is business error
   */
  isBusinessError(errorCode) {
    if (!errorCode) return false;
    const code = String(errorCode).toUpperCase();
    return BUSINESS_ERRORS.some((err) => code.includes(err) || code === err);
  }

  /**
   * Check if error is technical error
   */
  isTechnicalError(errorCode) {
    if (!errorCode) return false;
    const code = String(errorCode).toUpperCase();
    return TECHNICAL_ERRORS.some((err) => code.includes(err) || code === err);
  }

  /**
   * Extract gateway call to separate method
   */
  async callGatewayIntegration(payInRequestData) {
    const customer = {
      name: payInRequestData.customerName || "",
      email: payInRequestData.customerEmail || "",
      phone: payInRequestData.customerPhone || "",
    };

    const gatewayId = payInRequestData.gatewayId;
    const amount = Number(
      payInRequestData.amountInINR ||
        payInRequestData.amount ||
        payInRequestData.amountToCredit,
    );

    // Gateway Ids
    switch (gatewayId) {
      case 1: // FiatPay
        return await fiatPayIntegration.initiatePayInRequest(
          Number(
            payInRequestData.amountInINR ||
              payInRequestData.amount ||
              payInRequestData.amountToCredit,
          ),
          payInRequestData.merchantReference,
          customer,
          payInRequestData.paymentMode,
          payInRequestData.currency || "INR",
        );
      case 2: // Airpay
        return await airpayPayinIntegration.initiatePayInRequest(
          amount,
          payInRequestData.merchantReference,
          customer,
          payInRequestData.paymentMode,
          payInRequestData.currency || "INR",
        );
      case 3: // Pay10
        return await pay10Integration.initiatePayInRequest(
          Number(
            payInRequestData.amountInINR ||
              payInRequestData.amount ||
              payInRequestData.amountToCredit,
          ),
          payInRequestData.merchantReference,
          customer,
          payInRequestData.paymentMode,
          payInRequestData.currency || "INR",
        );
      case 19: // Dummy
        return await dummyPayinIntegration.initiatePayInRequest(
          Number(
            payInRequestData.amountInINR ||
              payInRequestData.amount ||
              payInRequestData.amountToCredit,
          ),
          payInRequestData.merchantReference,
          customer,
          payInRequestData.paymentMode,
          payInRequestData.currency || "INR",
        );
      default:
        throw new Error(`No integration found for gateway ID: ${gatewayId}`);
    }
  }

  // IDEMPOTENCY METHOD
  /**
   * Check if request with this idempotency key already exists
   */
  async checkIdempotency(idempotencyKey, merchantId) {
    if (!idempotencyKey) return null;

    // Check if request with this idempotency key already exists
    const existing = await prisma.payInRequest.findFirst({
      where: {
        merchantId: merchantId,
        metadata: {
          path: "$.idempotencyKey",
          equals: idempotencyKey,
        },
      },
    });

    return existing;
  }

  /**
   * Handle failed pay-in request callback
   */
  async onPayInRequestFailed(data) {
    const existing = await prisma.payInRequest.findUnique({
      where: { id: data.id },
    });
    if (!existing) throw new Error("Pay-in request not found");

    // Already final: don't overwrite a late FAIL over a SUCCESS (or vice versa)
    if (
      existing.status === PayInRequestStatus.COMPLETED ||
      existing.status === PayInRequestStatus.FAILED
    ) {
      return existing;
    }

    const oldMeta =
      existing.metadata && typeof existing.metadata === "object"
        ? existing.metadata
        : {};

    const res = await prisma.payInRequest.updateMany({
      where: {
        id: data.id,
        status: {
          in: [PayInRequestStatus.PENDING, PayInRequestStatus.PROCESSING],
        },
      },
      data: {
        status: PayInRequestStatus.FAILED,
        failureReason:
          data.failureReason || existing.failureReason || "Payment failed",
        failureCode:
          data.failureCode || existing.failureCode || "GATEWAY_FAILED",
        processedAt: new Date(),
        completedAt: new Date(),
        callbackReceived: true,
        callbackReceivedAt: new Date(),
        metadata: { ...oldMeta, ...(data.metadata || {}) },
      },
    });

    const updated = await prisma.payInRequest.findUnique({
      where: { id: data.id },
    });

    if (res.count > 0) {
      setImmediate(() => {
        this.sendMerchantWebhookWithRetry(updated).catch((e) =>
          console.error("[PayIn] Failed webhook error:", e?.message || e),
        );
      });
    }

    return updated;
  }

  /**
   * Handle successful pay-in request completion
   */
  async onPayInRequestCompleted(payInRequestData) {
    let attempts = 3;
    let lastError = null;

    while (attempts > 0) {
      try {
        // STEP 1: Get request first
        const existingRequest = await prisma.payInRequest.findUnique({
          where: { id: payInRequestData.id },
        });

        if (!existingRequest) {
          throw new Error("Pay-in request not found");
        }

        if (existingRequest.status === PayInRequestStatus.COMPLETED) {
          const existingWalletTx = await prisma.payInWallet.findUnique({
            where: { transactionId: existingRequest.id.toString() },
          });
          if (existingWalletTx) {
            console.log(
              `[Idempotency] Pay-in ${existingRequest.id} already COMPLETED with wallet, skipping`,
            );
            return existingRequest;
          }
          console.log(
            `[Idempotency] Pay-in ${existingRequest.id} COMPLETED but wallet missing — creating wallet credit now`,
          );
        }

        const lockKey =
          BigInt(existingRequest.merchantId) * 1000000n +
          BigInt(existingRequest.userId ?? 0);

        //  Lock aur transaction SAME connection pe, same `tx` se
        const result = await prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(
              `SELECT pg_advisory_xact_lock($1::bigint)`,
              lockKey.toString(),
            );

            const updated = await tx.payInRequest.update({
              where: { id: payInRequestData.id },
              data: {
                status: PayInRequestStatus.COMPLETED,
                processedAt: new Date(),
                completedAt: new Date(),
                callbackReceived: true,
                callbackReceivedAt: new Date(),
                cardNetwork:
                  payInRequestData.cardNetwork ||
                  existingRequest.cardNetwork ||
                  "UNKNOWN",
                metadata: payInRequestData.metadata || existingRequest.metadata,
              },
            });

            const lockedResult = await tx.$queryRaw`
            SELECT * FROM "PayInWallet" 
            WHERE "merchantId" = ${existingRequest.merchantId}
              AND "userId" = ${existingRequest.userId}
            ORDER BY id DESC 
            LIMIT 1
          `;
            const lastWallet = lockedResult[0];
            const openingBalance = lastWallet?.closingBalance || 0;
            const creditAmount = Number(
              existingRequest.amountToCredit || existingRequest.amount,
            );
            const closingBalance = Number(openingBalance) + creditAmount;

            // Check if wallet already exists
            const existingWalletTx = await tx.payInWallet.findUnique({
              where: { transactionId: existingRequest.id.toString() },
            });

            if (existingWalletTx) {
              console.log(`[Idempotency] Wallet already exists, skipping`);
              return existingRequest;
            }

            const walletTransaction = await tx.payInWallet.create({
              data: {
                merchantId: existingRequest.merchantId,
                userId: existingRequest.userId,
                amount: creditAmount,
                type: TransactionType.CREDIT,
                description: `Pay-in request completed - ${existingRequest.merchantReference}`,
                transactionId: existingRequest.id.toString(),
                transactionDate: new Date(),
                openingBalance: openingBalance,
                closingBalance: closingBalance,
              },
            });

            await tx.payInRequest.update({
              where: { id: payInRequestData.id },
              data: { payInWalletTransactionId: walletTransaction.id },
            });

            await this.updateWalletSummary(
              existingRequest.merchantId,
              existingRequest.userId,
              tx,
              closingBalance,
            );

            return updated;
          },
          {
            isolationLevel: "ReadCommitted",
            timeout: 30000,
            maxWait: 10000,
          },
        );

        // Webhook transaction ke bahar
        setImmediate(() => {
          this.sendMerchantWebhookWithRetry(result).catch((error) => {
            console.error(
              "[PayIn] Merchant webhook failed:",
              error?.message || error,
            );
          });
        });

        return result;
      } catch (error) {
        lastError = error;

        if (
          error.message?.includes("write conflict") ||
          error.message?.includes("deadlock") ||
          error.code === "P2034"
        ) {
          attempts--;
          if (attempts > 0) {
            const delay = (4 - attempts) * 300;
            console.log(
              `[Retry] Transaction failed, retrying in ${delay}ms. Attempts left: ${attempts}`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Update wallet summary for merchant
   */
  async updateWalletSummary(merchantId, userId, tx, currentBalance = null) {
    // Lock summaries
    await tx.$queryRaw`
        SELECT * FROM "PayInWalletSummary" 
        WHERE "merchantId" = ${merchantId} 
          AND "userId" = ${userId}
        FOR UPDATE
      `;

    let netBalance;
    if (currentBalance !== null) {
      netBalance = currentBalance;
    } else {
      const lockedWallet = await tx.$queryRaw`
      SELECT * FROM "PayInWallet" 
      WHERE "merchantId" = ${merchantId} 
        AND "userId" = ${userId}
      ORDER BY id DESC 
      LIMIT 1 
      FOR UPDATE
    `;
      const lastWallet = lockedWallet[0];
      netBalance = lastWallet?.closingBalance || 0;
    }

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const todayAmounts = await tx.payInRequest.aggregate({
      where: {
        merchantId,
        userId,
        status: "COMPLETED",
        completedAt: { gte: startOfDay },
      },
      _sum: {
        amount: true,
        feeAmount: true,
        taxAmount: true,
        amountToCredit: true,
      },
    });

    const completedToday = await tx.payInRequest.count({
      where: {
        merchantId,
        userId,
        status: "COMPLETED",
        completedAt: { gte: startOfDay },
      },
    });
    const failedToday = await tx.payInRequest.count({
      where: {
        merchantId,
        userId,
        status: "FAILED",
        completedAt: { gte: startOfDay },
      },
    });
    const pendingToday = await tx.payInRequest.count({
      where: {
        merchantId,
        userId,
        status: "PENDING",
        requestedAt: { gte: startOfDay },
      },
    });

    const creditAmt = todayAmounts._sum.amountToCredit
      ? Number(todayAmounts._sum.amountToCredit.toString())
      : 0;
    const feeAmt = todayAmounts._sum.feeAmount
      ? Number(todayAmounts._sum.feeAmount.toString())
      : 0;
    const taxAmt = todayAmounts._sum.taxAmount
      ? Number(todayAmounts._sum.taxAmount.toString())
      : 0;

    const totalInToday = creditAmt + feeAmt + taxAmt;
    const netChargesToday = feeAmt + taxAmt;

    const lastWalletForSummary = await tx.payInWallet.findFirst({
      where: { merchantId, userId },
      orderBy: { id: "desc" },
    });

    await tx.payInWalletSummary.upsert({
      where: { merchantId_userId: { merchantId, userId } },
      update: {
        closingBalance: netBalance,
        totalInToday: totalInToday,
        successfulPayIns: completedToday,
        failedPayIns: failedToday,
        pendingPayIns: pendingToday,
        totalPayIns: completedToday + failedToday + pendingToday,
        netChargesToday: netChargesToday,
        updatedAt: new Date(),
      },
      create: {
        merchantId,
        userId,
        closingBalance: netBalance,
        totalInToday: totalInToday,
        totalInThisWeek: 0,
        totalInThisMonth: 0,
        totalInThisYear: 0,
        successfulPayIns: completedToday,
        failedPayIns: failedToday,
        pendingPayIns: pendingToday,
        totalPayIns: completedToday + failedToday + pendingToday,
        netChargesToday: netChargesToday,
        netChargesThisWeek: 0,
        netChargesThisMonth: 0,
        netChargesThisYear: 0,
        lastTransactionProcessed: lastWalletForSummary?.id?.toString() || "",
      },
    });
  }

  notifyMerchantAsync(payInRequest) {
    this.sendMerchantWebhookWithRetry(payInRequest).catch((error) => {
      console.error(
        "[PayIn] Merchant webhook failed:",
        error?.message || error,
      );
    });
  }

  // WEBHOOK WITH RETRY
  /**
   * Send webhook to merchant with retry
   */
  async sendMerchantWebhookWithRetry(payInRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: payInRequest.merchantId },
      });

      if (!merchant?.webhookUrl) {
        return;
      }

      // Build the body in THIS merchant's format (from merchant.webhookConfig)
      const { body: webhookData, mode } = buildMerchantWebhook(
        merchant,
        payInRequest,
      );

      // Merchant chose not to receive this status (onlyStatuses)
      if (!webhookData) {
        return;
      }

      console.log(
        `[PayIn] Webhook for merchant ${merchant.id}, request ${payInRequest.id}, format mode: ${mode}`,
      );

      // Create outbound log with PENDING status
      const log = await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          gatewayId: payInRequest.gatewayId,
          eventType: WebhookEventType.PAY_IN_STATUS_UPDATE,
          requestBody: webhookData, // exactly what the merchant receives
          status: "PENDING",
          amount: payInRequest.amount,
          utr:
            payInRequest.metadata?.utr ||
            payInRequest.metadata?.rawPayload?.utr ||
            null,
        },
      });

      // Send webhook with retry
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

  /**
   * Send webhook with retry mechanism
   */
  async sendWebhookWithRetry(url, data, logId, maxRetries = 3) {
    let attempt = 0;
    let lastError = null;
    const axios = require("axios");

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

        // Success - update log
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

        // Update log with failure
        await prisma.outboundLog.update({
          where: { id: logId },
          data: {
            status: attempt >= maxRetries ? "FAILED" : "PENDING",
            responseStatus: error.response?.status || 500,
            responseBody: error.response?.data || error.message,
            processedAt: attempt >= maxRetries ? new Date() : null,
          },
        });

        // If not last attempt, wait before retry
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
          console.log(
            `[Webhook Retry] Waiting ${delay}ms before retry ${attempt + 1}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - schedule a retry job
    await this.scheduleWebhookRetry(logId);

    console.error(
      `[Webhook Retry] All ${maxRetries} attempts failed for log ${logId}`,
    );
    return { success: false, error: lastError };
  }

  /**
   * Schedule webhook retry for later
   */
  async scheduleWebhookRetry(logId) {
    try {
      console.log(`[Webhook] Scheduled retry for log ${logId}`);

      // Add to queue table for later processing
      await prisma.queue.create({
        data: {
          userReferenceId: logId.toString(),
          bankReferenceId: `WEBHOOK_${logId}`,
          gatewayId: "webhook_retry",
          status: "PENDING",
          amount: 0,
          retryCount: 0,
          maxRetryLimit: 3,
          nextCheckAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          lastCheckedAt: new Date(),
          metadata: {
            type: "webhook_retry",
            logId: logId,
          },
        },
      });
    } catch (error) {
      console.error(`Failed to schedule webhook retry:`, error.message);
    }
  }

  /**
   * Get all pay-in requests
   */
  async findAll(pagination, user, startDate, endDate, filterOptions = {}) {
    const where = {};

    if (
      user &&
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN" &&
      user.merchantId
    ) {
      where.merchantId = user.merchantId;
    }

    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = startDate;
      if (endDate) where.requestedAt.lte = endDate;
    }

    if (filterOptions.gatewayId) {
      where.gatewayId = parseInt(filterOptions.gatewayId);
    }

    if (filterOptions.merchantId) {
      where.merchantId = parseInt(filterOptions.merchantId);
    }

    if (filterOptions.userId) {
      where.userId = parseInt(filterOptions.userId);
    }

    if (filterOptions.status) {
      where.status = filterOptions.status;
    }

    if (filterOptions.paymentMode) {
      where.paymentMode = filterOptions.paymentMode;
    }

    if (filterOptions.search) {
      where.OR = [
        {
          merchantReference: {
            contains: filterOptions.search,
            mode: "insensitive",
          },
        },
        {
          metadata: {
            path: ["utr"],
            string_contains: filterOptions.search,
          },
        },
      ];
    }

    // ADD THIS BLOCK FOR UTR FILTER
    if (filterOptions.utr) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { metadata: { path: ["utr"], string_contains: filterOptions.utr } },
            {
              metadata: {
                path: ["rawPayload", "utr"],
                string_contains: filterOptions.utr,
              },
            },
            {
              metadata: {
                path: ["responseLog", "utr"],
                string_contains: filterOptions.utr,
              },
            },
          ],
        },
      ];
    }

    if (filterOptions.amountMin || filterOptions.amountMax) {
      const min =
        filterOptions.amountMin !== undefined &&
        filterOptions.amountMin !== null &&
        filterOptions.amountMin !== ""
          ? Number(filterOptions.amountMin)
          : null;
      const max =
        filterOptions.amountMax !== undefined &&
        filterOptions.amountMax !== null &&
        filterOptions.amountMax !== ""
          ? Number(filterOptions.amountMax)
          : null;

      const inrRange = {};
      const rawRange = {};
      if (min !== null) {
        inrRange.gte = min;
        rawRange.gte = min;
      }
      if (max !== null) {
        inrRange.lte = max;
        rawRange.lte = max;
      }

      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { amountInINR: inrRange },
            { AND: [{ amountInINR: null }, { amount: rawRange }] },
          ],
        },
      ];
    }

    if (filterOptions.feeType) {
      where.feeType = filterOptions.feeType;
    }

    const orderBy = filterOptions?.sorts || { requestedAt: "desc" };

    const [total, payInRequests] = await Promise.all([
      prisma.payInRequest.count({ where }),
      prisma.payInRequest.findMany({
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

    return { payInRequests, total };
  }

  /**
   * Get single pay-in request
   */
  async findOne(id) {
    const payInRequest = await prisma.payInRequest.findUnique({
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

    if (!payInRequest) {
      throw new Error("Pay-in request not found");
    }

    return payInRequest;
  }

  /**
   * Find by merchant reference
   */
  async findByMerchantReference(merchantReference) {
    const payInRequest = await prisma.payInRequest.findUnique({
      where: { merchantReference },
    });

    if (!payInRequest) {
      throw new Error("Pay-in request not found");
    }

    return payInRequest;
  }

  /**
   * Update pay-in request
   */
  async update(id, updateData) {
    return await prisma.payInRequest.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * ===== PAYMENT ORCHESTRATOR CONFIGURATION METHODS =====
   */

  /**
   * Configure merchant routing preferences
   */
  async configureMerchantRouting(merchantId, config) {
    return await paymentOrchestrator.configureMerchantRouting(
      merchantId,
      config,
    );
  }

  /**
   * Set gateway priority for merchant (Priority Routing)
   */
  async setGatewayPriority(merchantId, gateways) {
    return await paymentOrchestrator.setGatewayPriority(merchantId, gateways);
  }

  /**
   * Get merchant routing preference
   */
  async getMerchantRoutingPreference(merchantId) {
    return await paymentOrchestrator.getMerchantRoutingPreference(merchantId);
  }

  /**
   * Get gateway health statistics
   */
  async getGatewayHealth(gatewayId) {
    return await paymentOrchestrator.getGatewayHealth(gatewayId);
  }

  /**
   * Get all gateway health statistics
   */
  async getAllGatewayHealth() {
    const gateways = await prisma.gateway.findMany({
      include: { stats: true },
    });

    return Promise.all(
      gateways.map((gw) => paymentOrchestrator.getGatewayHealth(gw.id)),
    );
  }

  // CHARGEBACK INTEGRATION METHODS

  /**
   * Handle chargeback
   */
  async handleChargeback(payInRequestId, chargebackData) {
    const result = await prisma.$transaction(async (tx) => {
      const payInRequest = await tx.payInRequest.findUnique({
        where: { id: payInRequestId },
        include: { merchant: true, gateway: true },
      });

      if (!payInRequest) {
        throw new Error("Pay-in request not found");
      }

      if (payInRequest.status !== PayInRequestStatus.COMPLETED) {
        throw new Error("Only completed pay-in requests can have chargebacks");
      }

      // Check if chargeback already exists
      const existingChargeback = await tx.chargeback.findFirst({
        where: { payInRequestId: payInRequest.id },
      });

      if (existingChargeback) {
        throw new Error("A chargeback already exists for this pay-in request");
      }

      // Create chargeback record
      const chargeback = await tx.chargeback.create({
        data: {
          payInRequestId: payInRequest.id,
          merchantId: payInRequest.merchantId,
          gatewayId: payInRequest.gatewayId,
          amount: chargebackData.amount || payInRequest.amount,
          currency: chargebackData.currency || "INR",
          status: chargebackData.status || "PENDING",
          reason: chargebackData.reason || "CUSTOMER_DISPUTE",
          reasonDescription: chargebackData.reasonDescription || null,
          gatewayChargebackId: chargebackData.gatewayChargebackId || null,
          initiatedAt: new Date(),
          createdBy: chargebackData.createdBy || null,
          notes: chargebackData.notes || null,
          metadata: chargebackData.metadata || null,
        },
      });

      // Create chargeback log
      await tx.chargebackLog.create({
        data: {
          chargebackId: chargeback.id,
          action: "CREATED",
          statusAfter: "PENDING",
          description: `Chargeback created for pay-in request ${payInRequest.merchantReference}`,
        },
      });

      // Update pay-in request status
      await tx.payInRequest.update({
        where: { id: payInRequest.id },
        data: {
          status: PayInRequestStatus.FAILED,
          failureReason: `Chargeback initiated: ${chargebackData.reason || "Customer dispute"}`,
          failureCode: "CHARGEBACK",
          metadata: {
            ...payInRequest.metadata,
            chargebackId: chargeback.id,
          },
        },
      });

      // Send webhook to merchant
      await this.sendMerchantWebhookForChargeback(chargeback, payInRequest);

      return chargeback;
    });

    return result;
  }

  /**
   * Process chargeback wallet debit (when chargeback is APPROVED)
   */
  async processChargebackWalletDebit(chargebackId) {
    const result = await prisma.$transaction(async (tx) => {
      const chargeback = await tx.chargeback.findUnique({
        where: { id: chargebackId },
        include: { payInRequest: true },
      });

      if (!chargeback) {
        throw new Error("Chargeback not found");
      }

      if (chargeback.walletDebitTransactionId) {
        throw new Error("Chargeback already processed");
      }

      const lastWallet = await tx.payInWallet.findFirst({
        where: { merchantId: chargeback.merchantId },
        orderBy: { id: "desc" },
      });

      const openingBalance = lastWallet?.closingBalance || 0;
      const closingBalance = Number(openingBalance) - Number(chargeback.amount);

      const walletTransaction = await tx.payInWallet.create({
        data: {
          merchantId: chargeback.merchantId,
          amount: chargeback.amount,
          type: TransactionType.DEBIT,
          description: `Chargeback - ${chargeback.payInRequest.merchantReference}`,
          transactionId: chargeback.id.toString(),
          transactionDate: new Date(),
          openingBalance: openingBalance,
          closingBalance: closingBalance,
        },
      });

      await tx.chargeback.update({
        where: { id: chargebackId },
        data: {
          walletDebitTransactionId: walletTransaction.id,
          status: "APPROVED",
          resolvedAt: new Date(),
        },
      });

      const merchantUser = await tx.user.findFirst({
        where: {
          merchantId: chargeback.merchantId,
          role: "USER",
        },
        orderBy: { id: "asc" },
      });

      if (!merchantUser) {
        throw new Error(
          `No merchant user found for merchant: ${chargeback.merchantId}`,
        );
      }

      const userId = merchantUser.id;
      await this.updateWalletSummary(
        chargeback.merchantId,
        userId,
        tx,
        closingBalance,
      );

      return walletTransaction;
    });

    return result;
  }

  /**
   * Reverse chargeback wallet debit (when chargeback is REVERSED)
   */
  async reverseChargebackWalletDebit(chargebackId) {
    const result = await prisma.$transaction(async (tx) => {
      const chargeback = await tx.chargeback.findUnique({
        where: { id: chargebackId },
        include: { payInRequest: true },
      });

      if (!chargeback) {
        throw new Error("Chargeback not found");
      }

      if (chargeback.walletCreditTransactionId) {
        throw new Error("Chargeback already reversed");
      }

      const lastWallet = await tx.payInWallet.findFirst({
        where: { merchantId: chargeback.merchantId },
        orderBy: { id: "desc" },
      });

      const openingBalance = lastWallet?.closingBalance || 0;
      const creditAmount = chargeback.payInRequest?.amountInINR
        ? Number(chargeback.payInRequest.amountInINR)
        : Number(chargeback.amount);
      const closingBalance = Number(openingBalance) + creditAmount;

      const walletTransaction = await tx.payInWallet.create({
        data: {
          merchantId: chargeback.merchantId,
          amount: chargeback.amount,
          type: TransactionType.CREDIT,
          description: `Chargeback reversed - ${chargeback.payInRequest.merchantReference}`,
          transactionId: chargeback.id.toString(),
          transactionDate: new Date(),
          openingBalance: openingBalance,
          closingBalance: closingBalance,
        },
      });

      await tx.chargeback.update({
        where: { id: chargebackId },
        data: {
          walletCreditTransactionId: walletTransaction.id,
          status: "REVERSED",
          recoveredAmount: chargeback.amount,
          resolvedAt: new Date(),
        },
      });

      // Update pay-in request back to completed
      if (chargeback.payInRequest) {
        await tx.payInRequest.update({
          where: { id: chargeback.payInRequestId },
          data: {
            status: PayInRequestStatus.COMPLETED,
            failureReason: null,
            failureCode: null,
          },
        });
      }

      // Replace with merchant user ID lookup
      const merchantUser = await tx.user.findFirst({
        where: {
          merchantId: chargeback.merchantId,
          role: "USER",
        },
        orderBy: { id: "asc" },
      });

      if (!merchantUser) {
        throw new Error(
          `No merchant user found for merchant: ${chargeback.merchantId}`,
        );
      }

      const userId = merchantUser.id;
      await this.updateWalletSummary(
        chargeback.merchantId,
        userId,
        tx,
        closingBalance,
      );

      return walletTransaction;
    });

    return result;
  }

  /**
   * Send merchant webhook for chargeback
   */
  async sendMerchantWebhookForChargeback(chargeback, payInRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: chargeback.merchantId },
      });

      if (!merchant?.webhookUrl) {
        return;
      }

      const webhookData = {
        event: "CHARGEBACK_CREATED",
        data: {
          id: chargeback.id,
          payInRequestId: chargeback.payInRequestId,
          merchantReference: payInRequest.merchantReference,
          amount: Number(chargeback.amount),
          status: chargeback.status,
          reason: chargeback.reason,
          createdAt: chargeback.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      // Log outbound webhook
      await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          eventType: WebhookEventType.CHARGEBACK_CREATED,
          requestBody: webhookData,
          status: "PENDING",
          amount: chargeback.amount,
        },
      });

      const axios = require("axios");
      axios
        .post(merchant.webhookUrl, webhookData, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        })
        .catch((error) => {
          console.error("Failed to send chargeback webhook:", error.message);
        });
    } catch (error) {
      console.error("Error sending chargeback webhook:", error);
    }
  }

  /**
   * Get chargebacks for a merchant
   */
  async getChargebacksForMerchant(merchantId, pagination, filters) {
    const where = { merchantId: merchantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate) {
      where.createdAt = where.createdAt || {};
      where.createdAt.gte = new Date(filters.startDate);
    }

    if (filters?.endDate) {
      where.createdAt = where.createdAt || {};
      where.createdAt.lte = new Date(filters.endDate);
    }

    const orderBy = filters?.sorts || { createdAt: "desc" };

    const [total, chargebacks] = await Promise.all([
      prisma.chargeback.count({ where }),
      prisma.chargeback.findMany({
        where,
        orderBy,
        skip: pagination?.offset || 0,
        take: pagination?.limit || 10,
        include: {
          payInRequest: {
            select: {
              id: true,
              merchantReference: true,
              amount: true,
            },
          },
          gateway: {
            select: { id: true, name: true },
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      }),
    ]);

    return { chargebacks, total };
  }
}

module.exports = new PayInRequestsService();
