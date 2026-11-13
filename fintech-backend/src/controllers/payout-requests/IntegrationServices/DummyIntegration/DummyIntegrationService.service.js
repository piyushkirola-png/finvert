const axios = require("axios");
const crypto = require("crypto");
const { PayOutRequestStatus } = require("@prisma/client");

class DummyPayoutIntegrationService {
  constructor() {
    this.baseUrl = process.env.DUMMY_URL || "http://localhost:4100";
    this.apiKey = process.env.DUMMY_API_KEY || "dummy-api-key";
    this.defaultAccount = process.env.DUMMY_ACCOUNT_NUMBER || "1000000001";
    this.defaultIfsc = process.env.DUMMY_IFSC || "HDFC0001234";
    this.webhookSecret = process.env.DUMMY_SECERT_KEY || "dummy-webhook-secret";
    this.timeoutMs = Number(process.env.DUMMY_TIMEOUT_MS || 8000);
  }

  async initiatePayOutRequest(
    amount,
    merchantReference,
    beneficiaryDetails,
    options = {},
  ) {
    console.log(
      `[Dummy Payout] Initiate: amount=${amount}, merchantReference=${merchantReference}`,
    );

    try {
      if (!this.baseUrl) {
        throw new Error("Dummy Payout credentials not configured");
      }

      const accountNumber =
        beneficiaryDetails.accountNumber || this.defaultAccount;
      const ifsc = beneficiaryDetails.ifsc || this.defaultIfsc;
      const name = beneficiaryDetails.name || "Dummy Beneficiary";
      const bankName = beneficiaryDetails.bankName || "Dummy Bank";

      // STEP 1: Look up beneficiary from PayoutMock bank directory
      const beneficiaryRecord = await this.lookupBeneficiary(accountNumber);

      // STEP 2: IFSC invalid → business fail
      if (!this.isValidIfsc(ifsc)) {
        return this.buildFailureResponse({
          merchantReference,
          vendorRequest: JSON.stringify({
            accountNumber,
            ifsc,
            name,
            bankName,
          }),
          failureReason: `Invalid IFSC: ${ifsc}`,
          failureCode: "BENEFICIARY_INVALID",
        });
      }

      // STEP 3: Beneficiary not found / IFSC mismatch
      if (!beneficiaryRecord) {
        return this.buildFailureResponse({
          merchantReference,
          vendorRequest: JSON.stringify({
            accountNumber,
            ifsc,
            name,
            bankName,
          }),
          failureReason: `Beneficiary account not found: ${accountNumber}`,
          failureCode: "BENEFICIARY_INVALID",
        });
      }

      if (
        beneficiaryRecord.ifsc &&
        beneficiaryRecord.ifsc.toUpperCase() !== ifsc.toUpperCase()
      ) {
        return this.buildFailureResponse({
          merchantReference,
          vendorRequest: JSON.stringify({
            accountNumber,
            ifsc,
            name,
            bankName,
          }),
          failureReason: `IFSC mismatch. Expected ${beneficiaryRecord.ifsc}, got ${ifsc}`,
          failureCode: "BENEFICIARY_INVALID",
        });
      }

      // STEP 4: Optional bank-level amount check
      const maxReceivable = Number(beneficiaryRecord.maxReceivable || 0);
      if (maxReceivable > 0 && Number(amount) > maxReceivable) {
        return this.buildFailureResponse({
          merchantReference,
          vendorRequest: JSON.stringify({ accountNumber, amount }),
          failureReason: `Amount ${amount} exceeds bank limit ${maxReceivable}`,
          failureCode: "TRANSACTION_LIMIT_EXCEEDED",
        });
      }

      // STEP 5: Build the request body the mock expects
      const transferId = `DUMMY_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 6)}`;

      // Fields match PayoutMock's POST /payouts contract
      const payoutRequest = {
        reference_id: merchantReference,
        transfer_amount: amount,
        beneficiary_account: accountNumber,
        beneficiary_ifsc: ifsc,
        beneficiary_name: name,
        idempotency_key: options.idempotencyKey || null,
      };

      console.log(
        `[Dummy Payout] POST ${this.baseUrl}/payouts reference=${merchantReference}`,
      );

      // STEP 6: Actually call the mock gateway
      const response = await axios.post(
        `${this.baseUrl}/payouts`,
        payoutRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
          timeout: this.timeoutMs,
          validateStatus: () => true,
        },
      );

      const data = response.data?.data || response.data || {};
      const mockStatus = String(data.transfer_status || "PENDING").toUpperCase();

      console.log(
        `[Dummy Payout] Gateway responded: HTTP ${response.status}, transfer_status=${mockStatus}, transfer_id=${data.transfer_id || "n/a"}`,
      );

      // Gateway-side ambiguous errors → propagate as ambiguous
      if (response.status === 504) {
        const err = new Error("Dummy gateway timeout");
        err.code = "ETIMEDOUT";
        err.isAmbiguous = true;
        throw err;
      }
      if (response.status >= 500) {
        const err = new Error(
          data.message || `Dummy gateway error (HTTP ${response.status})`,
        );
        err.code = "SERVICE_UNAVAILABLE";
        err.isAmbiguous = response.status === 502;
        throw err;
      }

      // Business failure returned as HTTP 200 + transfer_status=FAILED
      if (mockStatus === "FAILED") {
        return this.buildFailureResponse({
          merchantReference,
          vendorRequest: JSON.stringify(payoutRequest),
          failureReason: data.failure_reason || "Payout failed at gateway",
          failureCode: data.failure_code || "DUMMY_PAYOUT_ERROR",
          transferId: data.transfer_id || transferId,
        });
      }

      // PENDING (or SUCCESS treated as pending) — webhook will settle it
      return {
        status: PayOutRequestStatus.PENDING,
        processedAt: new Date(),
        vendorReference: data.transfer_id || transferId,
        bankTransactionId: null,
        vendorRequest: JSON.stringify(payoutRequest),
        vendorResponse: JSON.stringify(data),
        failureReason: null,
        failureCode: null,
        notes: "Dummy payout pending - awaiting webhook",
        metadata: {
          transferId: data.transfer_id || transferId,
          reference_id: merchantReference,
          status: mockStatus,
          amount,
          behaviour: data.behaviour || null,
        },
        callbackNeeded: true,
      };
    } catch (error) {
      console.error("[Dummy Payout] Initiate error:", error.message);

      if (error.isAmbiguous || this.isAmbiguousError(error)) {
        const ambiguousError = new Error(error.message);
        ambiguousError.code = error.code || "ETIMEDOUT";
        ambiguousError.isAmbiguous = true;
        throw ambiguousError;
      }

      return this.buildFailureResponse({
        merchantReference,
        vendorRequest: null,
        failureReason: error.response?.data?.message || error.message,
        failureCode: error.response?.data?.code || "DUMMY_PAYOUT_ERROR",
      });
    }
  }

  async lookupBeneficiary(accountNumber) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank-accounts/${accountNumber}`,
        {
          headers: { "x-api-key": this.apiKey },
          timeout: this.timeoutMs,
        },
      );

      const data = response.data?.data || response.data;
      if (!data || !data.account) return null;

      return {
        account: data.account,
        name: data.name,
        ifsc: data.ifsc,
        bank: data.bank,
        behaviour: data.behaviour || null,
        maxReceivable: data.maxReceivable || 0,
      };
    } catch (error) {
      if (error.response?.status === 404) return null;

      if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNRESET" ||
        !error.response
      ) {
        const err = new Error(
          `Dummy bank directory unreachable: ${error.message}`,
        );
        err.code = error.code || "ETIMEDOUT";
        err.isAmbiguous = true;
        throw err;
      }
      throw error;
    }
  }

  resolveBehaviour(accountNumber, jsonBehaviour) {
    if (jsonBehaviour) return String(jsonBehaviour).toUpperCase();

    const first = String(accountNumber || "").charAt(0);
    switch (first) {
      case "1":
        return "PENDING_THEN_SUCCESS";
      case "2":
        return "BUSINESS_FAIL";
      case "3":
        return "PENDING_THEN_SUCCESS";
      case "4":
        return "PENDING_THEN_FAIL";
      case "5":
        return "TIMEOUT";
      case "6":
        return "RETRY_503";
      case "7":
        return "NEVER_CALLBACK";
      default:
        return "PENDING_THEN_SUCCESS";
    }
  }

  isValidIfsc(ifsc) {
    if (!ifsc) return false;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifsc).toUpperCase());
  }

  isAmbiguousError(error) {
    const code = String(error.code || "").toUpperCase();
    const ambiguousCodes = [
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNABORTED",
      "CONNECTION_TIMEOUT",
      "GATEWAY_TIMEOUT",
      "NETWORK_ERROR",
      "SSL_ERROR",
      "500",
      "502",
      "504",
    ];
    if (ambiguousCodes.includes(code)) return true;

    const text = `${error.message || ""} ${error.response?.data?.message || ""}`;
    return /timeout|timed out|socket hang up|network error|status code (500|502|504)/i.test(
      text,
    );
  }

  buildFailureResponse({
    merchantReference,
    vendorRequest,
    failureReason,
    failureCode,
    transferId,
  }) {
    return {
      status: PayOutRequestStatus.FAILED,
      processedAt: new Date(),
      vendorReference: transferId || null,
      bankTransactionId: null,
      vendorRequest: vendorRequest || null,
      vendorResponse: JSON.stringify({
        reference_id: merchantReference,
        failure_reason: failureReason,
        failure_code: failureCode,
      }),
      failureReason,
      failureCode,
      notes: "Dummy payout failed",
      metadata: { reference_id: merchantReference, failureReason, failureCode },
      callbackNeeded: false,
    };
  }

  async checkPayoutStatus(transferId) {
    console.log(`[Dummy Payout] Checking status: ${transferId}`);
    try {
      const response = await axios.get(
        `${this.baseUrl}/payout-status/${transferId}`,
        {
          headers: { "x-api-key": this.apiKey },
          timeout: this.timeoutMs,
        },
      );
      const payout = response.data?.data || response.data;
      return {
        status: this.mapPayoutStatus(payout.transfer_status),
        vendorReference: transferId,
        utr: payout.bank_reference || null,
        failureReason: payout.failure_reason || null,
        failureCode: payout.failure_code || null,
        metadata: {
          transferId: payout.transfer_id,
          status: payout.transfer_status,
          amount: payout.transfer_amount,
          utr: payout.bank_reference,
        },
      };
    } catch (error) {
      console.error("[Dummy Payout] Status check error:", error.message);
      return {
        status: PayOutRequestStatus.FAILED,
        vendorReference: transferId,
        failureReason: error.response?.data?.message || error.message,
        metadata: { error: error.response?.data || error.message },
      };
    }
  }

  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn(
        "[Dummy Payout] No webhook secret configured - skipping verification",
      );
      return true;
    }
    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");
      const isValid = expectedSignature === signature;
      if (!isValid) {
        console.warn("[Dummy Payout] Webhook signature verification failed");
      }
      return isValid;
    } catch (error) {
      console.error("[Dummy Payout] Signature verification error:", error);
      return false;
    }
  }

  mapPayoutStatus(dummyStatus) {
    const statusMap = {
      SUCCESS: PayOutRequestStatus.COMPLETED,
      COMPLETED: PayOutRequestStatus.COMPLETED,
      PROCESSING: PayOutRequestStatus.PENDING,
      PENDING: PayOutRequestStatus.PENDING,
      FAILED: PayOutRequestStatus.FAILED,
      CANCELLED: PayOutRequestStatus.FAILED,
    };
    return statusMap[dummyStatus] || PayOutRequestStatus.PENDING;
  }
}

module.exports = new DummyPayoutIntegrationService();