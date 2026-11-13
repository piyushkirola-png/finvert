const axios = require("axios");
const crypto = require("crypto");
const { PayInRequestStatus } = require("@prisma/client");

class DummyPayinIntegrationService {
  constructor() {
    this.baseUrl = process.env.DUMMY_URL || "http://localhost:4100";
    this.apiKey = process.env.DUMMY_API_KEY || "dummy-api-key";
    this.webhookSecret = process.env.DUMMY_SECERT_KEY || "dummy-webhook-secret";
    this.timeoutMs = Number(process.env.DUMMY_TIMEOUT_MS || 8000);
    this.appUrl = process.env.APP_URL || "http://localhost:4000";
  }

  /**
   * Initiate a payin request with the dummy gateway.
   * Returns a hosted payment URL (dummy "checkout page") that the customer opens.
   * The status starts as PROCESSING; it will settle when the webhook arrives.
   */
  async initiatePayInRequest(
    amount,
    merchantReference,
    customer,
    paymentMode = "PG",
    currency = "INR",
  ) {
    console.log(
      `[Dummy Payin] Initiate: amount=${amount}, ref=${merchantReference}, mode=${paymentMode}`,
    );

    try {
      // Ask the mock to "verify" the customer then hand back a checkout URL
      let mockResponse = null;
      try {
        mockResponse = await axios.post(
          `${this.baseUrl}/payin/create`,
          {
            reference_id: merchantReference,
            amount: Number(amount),
            currency,
            payment_mode: paymentMode,
            customer_name: customer?.name || "",
            customer_email: customer?.email || "",
            customer_phone: customer?.phone || "",
            callback_url: `${this.appUrl}/api/webhooks/dummy`,
            return_url: `${
              process.env.DUMMY_PAYIN_RETURN_URL ||
              "http://localhost:5173/payment/return"
            }?ref=${merchantReference}`,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": this.apiKey,
            },
            timeout: this.timeoutMs,
          },
        );
      } catch (err) {
        // If mock is down but it's a network error, treat as ambiguous
        if (
          err.code === "ECONNREFUSED" ||
          err.code === "ETIMEDOUT" ||
          err.code === "ECONNABORTED"
        ) {
          const ambiguous = new Error(
            `Dummy payin gateway unreachable: ${err.message}`,
          );
          ambiguous.code = err.code;
          ambiguous.isAmbiguous = true;
          throw ambiguous;
        }
        // Otherwise real business failure from mock
        const mockError =
          err.response?.data?.message || err.message || "Payin creation failed";
        return {
          status: PayInRequestStatus.FAILED,
          processedAt: new Date(),
          gatewayReference: null,
          failureReason: mockError,
          failureCode: err.response?.data?.code || "DUMMY_PAYIN_ERROR",
          notes: "Dummy payin initiation failed",
          metadata: { error: err.response?.data || err.message },
          callbackNeeded: false,
          intent: null,
          url: null,
        };
      }

      const data = mockResponse?.data?.data || mockResponse?.data || {};
      const checkoutUrl =
        data.checkout_url ||
        `${this.baseUrl}/pay/${encodeURIComponent(merchantReference)}`;

      return {
        status: PayInRequestStatus.PROCESSING,
        processedAt: new Date(),
        gatewayReference: data.gateway_reference || merchantReference,
        failureReason: null,
        failureCode: null,
        notes: "Dummy payin created - customer must complete on checkout page",
        metadata: {
          dummyCheckout: {
            checkoutUrl,
            merchantReference,
            amount: Number(amount),
            currency,
            paymentMode,
          },
        },
        callbackNeeded: true,
        intent: JSON.stringify({
          merchantReference,
          amount: Number(amount),
          currency,
          paymentMode,
          checkoutUrl,
        }),
        url: checkoutUrl,
      };
    } catch (error) {
      console.error("[Dummy Payin] Initiate error:", error.message);

      if (error.isAmbiguous) {
        const re = new Error(error.message);
        re.code = error.code || "ETIMEDOUT";
        re.isAmbiguous = true;
        throw re;
      }

      return {
        status: PayInRequestStatus.FAILED,
        processedAt: new Date(),
        gatewayReference: null,
        failureReason: error.message,
        failureCode: "DUMMY_PAYIN_ERROR",
        notes: "Dummy payin initiation exception",
        metadata: { error: error.message },
        callbackNeeded: false,
        intent: null,
        url: null,
      };
    }
  }

  /**
   * Check payin status (used by reconciliation jobs).
   */
  async checkStatus(merchantReference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payin/${encodeURIComponent(merchantReference)}`,
        {
          headers: { "x-api-key": this.apiKey },
          timeout: this.timeoutMs,
        },
      );

      const data = response.data?.data || response.data;
      return {
        status: this.mapPayinStatus(data.status),
        merchantReference,
        txnId: data.gateway_reference || null,
        utr: data.utr || null,
        amount: data.amount,
        responseLog: data,
      };
    } catch (err) {
      console.error("[Dummy Payin] Status check error:", err.message);
      return {
        status: PayInRequestStatus.FAILED,
        failureReason: err.message,
      };
    }
  }

  /**
   * Verify webhook signature (HMAC-SHA256 over JSON.stringify(payload)).
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn(
        "[Dummy Payin] No webhook secret configured - skipping verification",
      );
      return true;
    }
    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");
      return expectedSignature === signature;
    } catch (error) {
      console.error("[Dummy Payin] Signature verification error:", error);
      return false;
    }
  }

  /**
   * Map dummy statuses to our enum.
   */
  mapPayinStatus(dummyStatus) {
    const statusMap = {
      SUCCESS: PayInRequestStatus.COMPLETED,
      COMPLETED: PayInRequestStatus.COMPLETED,
      PAID: PayInRequestStatus.COMPLETED,
      PROCESSING: PayInRequestStatus.PROCESSING,
      PENDING: PayInRequestStatus.PENDING,
      FAILED: PayInRequestStatus.FAILED,
      CANCELLED: PayInRequestStatus.FAILED,
      EXPIRED: PayInRequestStatus.FAILED,
    };
    return statusMap[dummyStatus] || PayInRequestStatus.PENDING;
  }
}

module.exports = new DummyPayinIntegrationService();
