const axios = require("axios");
const { PayInRequestStatus } = require("@prisma/client");

class FiatPayIntegrationService {
  constructor() {
    this.baseUrl =
      process.env.FIATPAY_BASE_URL || "https://corppro.fiatpay.org";
    this.clientId = process.env.FIATPAY_CLIENT_ID;
    this.clientSecret = process.env.FIATPAY_CLIENT_SECRET;
    this.timeoutMs = Number(process.env.FIATPAY_TIMEOUT_MS || 30000);
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "Client-ID": this.clientId,
      "Client-Secret": this.clientSecret,
    };
  }

  /**
   * Initiate a UPI-intent payin with FiatPay.
   *
   * @param {number} amount            - amount in INR (rupees)
   * @param {string} merchantReference - our unique order_id
   * @param {object} customer          - { name, email, phone }
   * @param {string} paymentMode       - (must be UPI_INTENT / UPI for now)
   * @param {string} currency          - (must be INR)
   */
  async initiatePayInRequest(
    amount,
    merchantReference,
    customer,
    paymentMode = "UPI_INTENT",
    currency = "INR",
  ) {
    console.log(
      `[FiatPay] CreateOrder: order_id=${merchantReference}, amount=${amount}, mode=${paymentMode}`,
    );

    // ---- Local validation before we hit FiatPay ----
    if (currency !== "INR") {
      return this._buildFailureResponse({
        failureReason: `FiatPay only supports INR, got ${currency}`,
        failureCode: "INVALID_CURRENCY",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) < 101) {
      return this._buildFailureResponse({
        failureReason: "Amount must be at least ₹101",
        failureCode: "INVALID_AMOUNT",
      });
    }

    if (Number(amount) >= 200000) {
      return this._buildFailureResponse({
        failureReason: "Amount must be less than ₹2,00,000",
        failureCode: "INVALID_AMOUNT",
      });
    }

    if (!merchantReference || String(merchantReference).length > 30) {
      return this._buildFailureResponse({
        failureReason: "order_id must be 1-30 characters",
        failureCode: "INVALID_REQUEST",
      });
    }

    const phone = String(customer?.phone || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(phone)) {
      return this._buildFailureResponse({
        failureReason: "Customer mobile must be 10 digits",
        failureCode: "INVALID_PHONE",
      });
    }

    if (!customer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return this._buildFailureResponse({
        failureReason: "Customer email is invalid",
        failureCode: "INVALID_EMAIL",
      });
    }

    const requestBody = {
      order_id: String(merchantReference),
      amount: String(Math.round(Number(amount))),
      mobileno: phone,
      name: customer?.name || "Customer",
      email: customer.email,
      payment_remark: `Payin ${merchantReference}`,
    };

    let response;
    try {
      response = await axios.post(
        `${this.baseUrl}/QRService.svc/CreateQRIntent`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: this.timeoutMs,
        },
      );
    } catch (error) {
      // Network errors → ambiguous (gateway might have created the order)
      const code = String(error.code || "").toUpperCase();
      if (
        [
          "ECONNABORTED",
          "ETIMEDOUT",
          "ECONNRESET",
          "ECONNREFUSED",
          "EAI_AGAIN",
          "ENOTFOUND",
        ].includes(code) ||
        !error.response
      ) {
        const ambiguous = new Error(
          `FiatPay unreachable: ${error.message}`,
        );
        ambiguous.code = code || "ETIMEDOUT";
        ambiguous.isAmbiguous = true;
        throw ambiguous;
      }

      const errData = error.response?.data;
      return this._buildFailureResponse({
        failureReason:
          errData?.res_message ||
          errData?.message ||
          error.message ||
          "FiatPay request failed",
        failureCode:
          errData?.res_status === "REJECT"
            ? "UNAUTHORIZED"
            : "GATEWAY_ERROR",
        metadata: {
          httpStatus: error.response?.status,
          rawResponse: errData,
          requestBody,
        },
      });
    }

    const data = response.data || {};
    const resStatus = String(data.res_status || "").toUpperCase();
    const resCode = Number(data.res_code);

    // ---------- REJECT: business error (bad credentials / no retry) ----------
    if (resStatus === "REJECT" || resCode === -1) {
      return this._buildFailureResponse({
        failureReason: data.res_message || "FiatPay rejected the request",
        failureCode: "UNAUTHORIZED",
        metadata: { res_code: resCode, rawResponse: data },
        gatewayReference: data.api_txnid || null,
      });
    }

    // ---------- FAILED: technical (retryable) ----------
    if (resStatus === "FAILED" || resCode === 0) {
      return this._buildFailureResponse({
        failureReason: data.res_message || "Intent generation failed",
        failureCode: "GATEWAY_ERROR",
        metadata: { res_code: resCode, rawResponse: data },
        gatewayReference: data.api_txnid || null,
      });
    }

    // ---------- CREATED: order created, awaiting customer payment ----------
    if (resStatus === "CREATED" || resCode === 2) {
      const intentUrl = data.qr_intent || null;
      if (!intentUrl) {
        return this._buildFailureResponse({
          failureReason: "FiatPay did not return a qr_intent URL",
          failureCode: "GATEWAY_ERROR",
          metadata: { res_code: resCode, rawResponse: data },
          gatewayReference: data.api_txnid || null,
        });
      }

      const intent = {
        type: "UPI_INTENT",
        order_id: requestBody.order_id,
        api_txnid: data.api_txnid || null,
        amount: Number(amount),
        currency: "INR",
        qr_intent: intentUrl,
      };

      return {
        status: PayInRequestStatus.PROCESSING,
        processedAt: new Date(),
        gatewayReference: data.api_txnid || requestBody.order_id,
        failureReason: null,
        failureCode: null,
        notes: "FiatPay order created - awaiting customer UPI payment",
        metadata: {
          fiatpay: {
            api_txnid: data.api_txnid,
            res_code: resCode,
            res_status: resStatus,
            res_message: data.res_message,
            charges: data.charges,
            qr_intent: intentUrl,
            order_id: requestBody.order_id,
            paymentMode,
          },
        },
        callbackNeeded: true,
        intent: JSON.stringify(intent),
        url: intentUrl,
      };
    }

    // ---------- Any other status ----------
    return this._buildFailureResponse({
      failureReason: `Unexpected FiatPay status: ${resStatus || resCode}`,
      failureCode: "GATEWAY_ERROR",
      metadata: { rawResponse: data },
      gatewayReference: data.api_txnid || null,
    });
  }

  /**
   * Explicit status check (used by reconciliation jobs later).
   */
  async checkStatus(orderId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/QRService.svc/StatusCheck`,
        { orderid: String(orderId) },
        {
          headers: this.getHeaders(),
          timeout: this.timeoutMs,
        },
      );
      return { success: true, data: response.data };
    } catch (error) {
      const errData = error.response?.data;
      return {
        success: false,
        error: errData?.res_message || error.message,
        rawResponse: errData || null,
      };
    }
  }

  _buildFailureResponse({
    failureReason,
    failureCode,
    metadata = {},
    gatewayReference = null,
  }) {
    return {
      status: PayInRequestStatus.FAILED,
      processedAt: new Date(),
      gatewayReference,
      failureReason,
      failureCode,
      notes: "FiatPay initiate failed",
      metadata,
      callbackNeeded: false,
      intent: null,
      url: null,
    };
  }
}

module.exports = new FiatPayIntegrationService();