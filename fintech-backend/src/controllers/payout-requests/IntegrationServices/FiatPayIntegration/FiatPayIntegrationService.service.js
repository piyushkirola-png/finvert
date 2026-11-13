const axios = require("axios");
const { PayOutRequestStatus } = require("@prisma/client");

class FiatPayPayoutIntegrationService {
  constructor() {
    this.baseUrl =
      process.env.FIATPAY_BASE_URL || "https://corppro.fiatpay.org";
    this.clientId = process.env.FIATPAY_CLIENT_ID;
    this.clientSecret = process.env.FIATPAY_CLIENT_SECRET;
    this.timeoutMs = Number(process.env.FIATPAY_TIMEOUT_MS || 30000);
    this.senderFirstName =
      process.env.FIATPAY_SENDER_FIRST_NAME || "Merchant";
    this.senderLastName =
      process.env.FIATPAY_SENDER_LAST_NAME || "Account";
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "Client-ID": this.clientId,
      "Client-Secret": this.clientSecret,
    };
  }

  /**
   * Initiate a bank payout with FiatPay.
   *
   * @param {number} amount            - amount in INR (rupees)
   * @param {string} merchantReference - our unique order_id
   * @param {object} beneficiary       - { name, accountNumber, ifsc, bankName, email, mobile }
   * @param {object} options           - { idempotencyKey }
   */
  async initiatePayOutRequest(
    amount,
    merchantReference,
    beneficiary = {},
    options = {},
  ) {
    console.log(
      `[FiatPay Payout] PayoutTransfer: order_id=${merchantReference}, amount=${amount}`,
    );

    // ---------- Local validation ----------
    if (!Number.isFinite(Number(amount)) || Number(amount) < 101) {
      return this._buildFailureResponse({
        failureReason: "Payout amount must be at least ₹101",
        failureCode: "INVALID_AMOUNT",
      });
    }
    if (Number(amount) >= 200000) {
      return this._buildFailureResponse({
        failureReason: "Payout amount must be less than ₹2,00,000",
        failureCode: "INVALID_AMOUNT",
      });
    }
    if (!merchantReference || String(merchantReference).length > 30) {
      return this._buildFailureResponse({
        failureReason: "order_id must be 1-30 characters",
        failureCode: "INVALID_REQUEST",
      });
    }
    if (!beneficiary.name) {
      return this._buildFailureResponse({
        failureReason: "Beneficiary name is required",
        failureCode: "INVALID_REQUEST",
      });
    }
    if (!beneficiary.accountNumber) {
      return this._buildFailureResponse({
        failureReason: "Beneficiary account number is required",
        failureCode: "INVALID_REQUEST",
      });
    }
    if (
      !beneficiary.ifsc ||
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
        String(beneficiary.ifsc).toUpperCase(),
      )
    ) {
      return this._buildFailureResponse({
        failureReason: "Beneficiary IFSC is invalid",
        failureCode: "INVALID_REQUEST",
      });
    }

    const mobile = String(beneficiary.mobile || "9999999999").replace(
      /\D/g,
      "",
    );
    const mobileFinal = /^\d{10}$/.test(mobile) ? mobile : "9999999999";

    const email =
      beneficiary.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(beneficiary.email)
        ? beneficiary.email
        : "payout@example.com";

    const requestBody = {
      order_id: String(merchantReference),
      amount: String(Math.round(Number(amount))),
      mobile_no: mobileFinal,
      bene_name: String(beneficiary.name),
      account_no: String(beneficiary.accountNumber),
      ifsc: String(beneficiary.ifsc).toUpperCase(),
      bank_name: String(beneficiary.bankName || "Bank"),
      email_id: email,
      payment_remark: `Payout ${merchantReference}`,
      first_name: this.senderFirstName,
      last_name: this.senderLastName,
    };

    let response;
    try {
      response = await axios.post(
        `${this.baseUrl}/PayoutService.svc/PayoutTransfer`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: this.timeoutMs,
        },
      );
    } catch (error) {
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
        // Ambiguous: payout may have been accepted before the connection died.
        const ambiguous = new Error(
          `FiatPay payout unreachable: ${error.message}`,
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
          "FiatPay payout request failed",
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
    const apiTxnId = data.api_txnid || null;

    // ---------- REJECT (bad credentials, no retry) ----------
    if (resStatus === "REJECT" || resCode === -1) {
      return this._buildFailureResponse({
        failureReason: data.res_message || "FiatPay rejected the payout",
        failureCode: "UNAUTHORIZED",
        gatewayReference: apiTxnId,
        metadata: { res_code: resCode, rawResponse: data },
      });
    }

    // ---------- FAILED (business failure — insufficient balance, invalid account) ----------
    if (resStatus === "FAILED" || resCode === 0) {
      return this._buildFailureResponse({
        failureReason: data.res_message || "FiatPay payout failed",
        failureCode: "GATEWAY_ERROR",
        gatewayReference: apiTxnId,
        metadata: { res_code: resCode, rawResponse: data },
      });
    }

    // ---------- PENDING (accepted, awaiting final status via webhook) ----------
    if (resStatus === "PENDING" || resStatus === "CREATED" || resCode === 2) {
      return {
        status: PayOutRequestStatus.PENDING,
        processedAt: new Date(),
        vendorReference: apiTxnId,
        bankTransactionId: data.utr_no || null,
        vendorRequest: JSON.stringify(requestBody),
        vendorResponse: JSON.stringify(data),
        failureReason: null,
        failureCode: null,
        notes: "FiatPay payout accepted - awaiting callback",
        metadata: {
          fiatpay: {
            api_txnid: apiTxnId,
            res_code: resCode,
            res_status: resStatus,
            res_message: data.res_message,
            charges: data.charges,
            utr_no: data.utr_no || null,
            order_id: requestBody.order_id,
          },
          idempotencyKey: options.idempotencyKey || null,
        },
        callbackNeeded: true,
      };
    }

    // ---------- SUCCESS (synchronous — rare for payouts) ----------
    if (resStatus === "SUCCESS" || resCode === 1) {
      return {
        status: PayOutRequestStatus.COMPLETED,
        processedAt: new Date(),
        vendorReference: apiTxnId,
        bankTransactionId: data.utr_no || null,
        vendorRequest: JSON.stringify(requestBody),
        vendorResponse: JSON.stringify(data),
        failureReason: null,
        failureCode: null,
        notes: "FiatPay payout completed synchronously",
        metadata: {
          fiatpay: {
            api_txnid: apiTxnId,
            utr: data.utr_no || null,
            rawResponse: data,
          },
          utr: data.utr_no || null,
        },
        callbackNeeded: false,
      };
    }

    return this._buildFailureResponse({
      failureReason: `Unexpected FiatPay payout status: ${resStatus || resCode}`,
      failureCode: "GATEWAY_ERROR",
      gatewayReference: apiTxnId,
      metadata: { rawResponse: data },
    });
  }

  async checkStatus(orderId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/PayoutService.svc/StatusCheck`,
        { orderid: String(orderId) },
        { headers: this.getHeaders(), timeout: this.timeoutMs },
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.res_message || error.message,
        rawResponse: error.response?.data || null,
      };
    }
  }

  async getBalance() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/PayoutService.svc/GetBalance`,
        {},
        { headers: this.getHeaders(), timeout: this.timeoutMs },
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.res_message || error.message,
        rawResponse: error.response?.data || null,
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
      status: PayOutRequestStatus.FAILED,
      processedAt: new Date(),
      vendorReference: gatewayReference,
      bankTransactionId: null,
      vendorRequest: null,
      vendorResponse: null,
      failureReason,
      failureCode,
      notes: "FiatPay payout initiate failed",
      metadata,
      callbackNeeded: false,
    };
  }
}

module.exports = new FiatPayPayoutIntegrationService();