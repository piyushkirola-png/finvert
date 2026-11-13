const axios = require("axios");
const crypto = require("crypto");
const { PayInRequestStatus } = require("@prisma/client");

class Pay10IntegrationService {
  constructor() {
    this.baseUrl =
      process.env.PAY10_BASE_URL || "https://secure.pay10.com";
    this.mid = process.env.PAY10_MID;
    this.secretKey = process.env.PAY10_SECRET_KEY;
    this.aesKey = process.env.PAY10_API_KEY;
    this.timeoutMs = Number(process.env.PAY10_TIMEOUT_MS || 30000);
    this.endpoint = `${this.baseUrl}/pgws/upi/collectpay`;
  }
  
  async initiatePayInRequest(
    amount,
    merchantReference,
    customer,
    paymentMode = "UPI_INTENT",
    currency = "INR",
  ) {
    console.log(
      `[Pay10] CreateIntent: order_id=${merchantReference}, amount=${amount}, mode=${paymentMode}`,
    );

    // ---- local validation ----
    if (currency !== "INR") {
      return this._buildFailureResponse({
        failureReason: `Pay10 only supports INR, got ${currency}`,
        failureCode: "INVALID_CURRENCY",
      });
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return this._buildFailureResponse({
        failureReason: "Amount must be a positive number",
        failureCode: "INVALID_AMOUNT",
      });
    }

    if (!merchantReference || String(merchantReference).length > 50) {
      return this._buildFailureResponse({
        failureReason: "order_id must be 1-50 characters",
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

    if (!this.mid || !this.secretKey || !this.aesKey) {
      return this._buildFailureResponse({
        failureReason: "Pay10 credentials are not configured",
        failureCode: "CONFIG_ERROR",
      });
    }

    // ---- build request params (AMOUNT in paisa) ----
    const amountInPaisa = String(Math.round(amt * 100));

    const params = {
      PAY_ID: String(this.mid),
      ORDER_ID: String(merchantReference),
      AMOUNT: amountInPaisa,
      CURRENCY_CODE: "356",
      TXNTYPE: "SALE",
      MOP_TYPE: "UP",
      PAYMENT_TYPE: "UP",
      CUST_EMAIL: customer.email,
      CUST_PHONE: phone,
      UPI_INTENT: "1", // intent flow
    };

    let payload;
    try {
      payload = this._buildEncryptedPayload(params);
    } catch (err) {
      return this._buildFailureResponse({
        failureReason: `Pay10 encryption failed: ${err.message}`,
        failureCode: "ENCRYPTION_ERROR",
      });
    }

    // ---- call Pay10 ----
    let response;
    try {
      response = await axios.post(
        this.endpoint,
        { PAY_ID: String(this.mid), ENCDATA: payload.encrypted },
        {
          headers: { "Content-Type": "application/json" },
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
        const ambiguous = new Error(
          `Pay10 unreachable: ${error.message}`,
        );
        ambiguous.code = code || "ETIMEDOUT";
        ambiguous.isAmbiguous = true;
        throw ambiguous;
      }

      const errData = error.response?.data;
      return this._buildFailureResponse({
        failureReason:
          errData?.RESPONSE_MESSAGE ||
          errData?.message ||
          error.message ||
          "Pay10 request failed",
        failureCode: "GATEWAY_ERROR",
        metadata: {
          httpStatus: error.response?.status,
          rawResponse: errData,
          requestBody: params,
        },
      });
    }

    // ---- decrypt + parse response ----
    const encData = response.data?.ENCDATA;
    if (!encData) {
      return this._buildFailureResponse({
        failureReason: "Pay10 response missing ENCDATA",
        failureCode: "GATEWAY_ERROR",
        metadata: { rawResponse: response.data },
      });
    }

    let decoded;
    try {
      const plain = this._decrypt(encData);
      decoded = this._parseKeyValue(plain);
    } catch (err) {
      return this._buildFailureResponse({
        failureReason: `Pay10 response decrypt/parse failed: ${err.message}`,
        failureCode: "RESPONSE_DECRYPT_ERROR",
        metadata: { rawResponse: response.data },
      });
    }

    const responseCode = decoded.RESPONSE_CODE;
    const status = String(decoded.STATUS || "").toUpperCase();
    const txnId = decoded.TXN_ID || null;
    const pgRefNum = decoded.PG_REF_NUM || null;
    const qrString = decoded.QRSTRING || null;
    const gatewayRef = txnId || pgRefNum || merchantReference;

    // RESPONSE_CODE 000 => accepted. STATUS will be "Sent to Bank" (pending).
    if (responseCode === "000") {
      // If no QRSTRING, treat as gateway error (intent needs it)
      if (!qrString) {
        return this._buildFailureResponse({
          failureReason: "Pay10 did not return QRSTRING for intent",
          failureCode: "GATEWAY_ERROR",
          metadata: { decoded },
          gatewayReference: gatewayRef,
        });
      }

      const intent = {
        type: "UPI_INTENT",
        order_id: String(merchantReference),
        txn_id: txnId,
        amount: amt,
        currency: "INR",
        qr_intent: qrString,
      };

      return {
        status: PayInRequestStatus.PROCESSING,
        processedAt: new Date(),
        gatewayReference: gatewayRef,
        failureReason: null,
        failureCode: null,
        notes: "Pay10 intent created - awaiting customer UPI payment",
        metadata: {
          pay10: {
            RESPONSE_CODE: responseCode,
            STATUS: status,
            RESPONSE_MESSAGE: decoded.RESPONSE_MESSAGE || null,
            TXN_ID: txnId,
            PG_REF_NUM: pgRefNum,
            PAYER_NAME: decoded.PAYER_NAME || null,
            PAYER_ADDRESS: decoded.PAYER_ADDRESS || null,
            QRSTRING: qrString,
            AMOUNT: decoded.AMOUNT || amountInPaisa,
            TOTAL_AMOUNT: decoded.TOTAL_AMOUNT || amountInPaisa,
            order_id: String(merchantReference),
            paymentMode,
            rawDecoded: decoded,
          },
        },
        callbackNeeded: true,
        intent: JSON.stringify(intent),
        url: qrString,
      };
    }

    // Any non-000 => failed
    return this._buildFailureResponse({
      failureReason:
        decoded.RESPONSE_MESSAGE ||
        `Pay10 rejected intent: ${responseCode || "UNKNOWN"}`,
      failureCode: "GATEWAY_ERROR",
      metadata: { decoded },
      gatewayReference: gatewayRef,
    });
  }

  async checkStatus(orderId, amountInINR) {
    try {
      const amt = String(Math.round(Number(amountInINR) * 100));
      const hashParams = {
        PAY_ID: String(this.mid),
        ORDER_ID: String(orderId),
        AMOUNT: amt,
        CURRENCY_CODE: "356",
        TXNTYPE: "STATUS",
      };
      const hash = this._generateHash(hashParams);

      const body = {
        PAY_ID: String(this.mid),
        ORDER_ID: String(orderId),
        AMOUNT: amt,
        CURRENCY_CODE: "356",
        TXNTYPE: "STATUS",
        HASH: hash,
      };

      const response = await axios.post(
        `${this.baseUrl}/pgws/transact`,
        body,
        {
          headers: { "Content-Type": "application/json" },
          timeout: this.timeoutMs,
        },
      );

      const decoded =
        typeof response.data === "string"
          ? this._parseKeyValue(response.data)
          : this._parseKeyValue(JSON.stringify(response.data));

      return { success: true, data: decoded };
    } catch (error) {
      const errData = error.response?.data;
      return {
        success: false,
        error: errData?.RESPONSE_MESSAGE || error.message,
        rawResponse: errData || null,
      };
    }
  }

  // ---------------- Internal helpers ----------------

  _buildEncryptedPayload(params) {
    const hash = this._generateHash(params);
    const withHash = { ...params, HASH: hash };
    const sorted = this._sortAndJoin(withHash); // no salt appended
    const encrypted = this._encrypt(sorted);
    return { hash, plainWithHash: sorted, encrypted };
  }

  _generateHash(params) {
    const sorted = this._sortAndJoin(params);
    const withSalt = sorted + this.secretKey;
    return crypto
      .createHash("sha256")
      .update(withSalt, "utf8")
      .digest("hex")
      .toUpperCase();
  }

  _sortAndJoin(obj) {
    return Object.keys(obj)
      .sort()
      .map((k) => `${k}=${obj[k]}`)
      .join("~");
  }

  _encrypt(plainText) {
    const keyBuf = Buffer.from(this.aesKey, "utf8");
    const iv = Buffer.from(this.aesKey.substring(0, 16), "utf8");
    const cipher = crypto.createCipheriv("aes-256-cbc", keyBuf, iv);
    return Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]).toString("base64");
  }

  _decrypt(encBase64) {
    const keyBuf = Buffer.from(this.aesKey, "utf8");
    const iv = Buffer.from(this.aesKey.substring(0, 16), "utf8");
    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuf, iv);
    return Buffer.concat([
      decipher.update(Buffer.from(encBase64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  _parseKeyValue(str) {
    const out = {};
    if (!str) return out;
    const cleaned = str.replace(/^\{|\}$/g, "").trim();
    for (const pair of cleaned.split("~")) {
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
    return out;
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
      notes: "Pay10 initiate failed",
      metadata,
      callbackNeeded: false,
      intent: null,
      url: null,
    };
  }
}

module.exports = new Pay10IntegrationService();