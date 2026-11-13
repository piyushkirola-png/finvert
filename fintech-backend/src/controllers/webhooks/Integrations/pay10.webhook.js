const {
  PayInRequestStatus,
  WebhookStatus,
  WebhookEventType,
} = require("@prisma/client");
const crypto = require("crypto");

class Pay10Webhook {
  constructor() {
    this.aesKey = process.env.PAY10_API_KEY;
    this.mid = process.env.PAY10_MID;
  }

  async process(payload, headers) {
    console.log(
      "[Pay10 Webhook] Received:",
      JSON.stringify(payload, null, 2),
    );

    try {
      const decoded = this._extractDecodedPayload(payload);

      // verify integrity if HASH present
      const hashCheck = this._verifyHash(decoded);
      if (hashCheck.checked && !hashCheck.valid) {
        console.warn("[Pay10 Webhook] HASH mismatch — marking pending");
        return this._buildResponse({
          decoded,
          ourStatus: PayInRequestStatus.PENDING,
          webhookStatus: WebhookStatus.PENDING,
          failureReason: "HASH verification failed",
          failureCode: "HASH_MISMATCH",
        });
      }

      return this._processPayinCallback(decoded);
    } catch (error) {
      console.error("[Pay10 Webhook] Dispatch error:", error);
      return this._buildErrorResponse(payload, error.message);
    }
  }

  _extractDecodedPayload(payload) {
    // If ENCDATA present -> decrypt
    if (payload && typeof payload.ENCDATA === "string" && this.aesKey) {
      const plain = this._decrypt(payload.ENCDATA);
      return this._parseKeyValue(plain);
    }
    // Else assume already-decoded key/value object or string
    if (typeof payload === "string") {
      return this._parseKeyValue(payload);
    }
    return { ...payload };
  }

  _verifyHash(decoded) {
    try {
      if (!decoded || !decoded.HASH) return { checked: false };
      const secretKey = process.env.PAY10_SECRET_KEY;
      if (!secretKey) return { checked: false };

      const provided = String(decoded.HASH).toUpperCase();
      const clone = { ...decoded };
      delete clone.HASH;

      const sorted = Object.keys(clone)
        .sort()
        .map((k) => `${k}=${clone[k]}`)
        .join("~");
      const expected = crypto
        .createHash("sha256")
        .update(sorted + secretKey, "utf8")
        .digest("hex")
        .toUpperCase();

      return { checked: true, valid: expected === provided, expected };
    } catch (e) {
      return { checked: false };
    }
  }

  _processPayinCallback(decoded) {
    const orderId =
      decoded.ORDER_ID || decoded.orderid || decoded.merchantReference || null;
    const txnId = decoded.TXN_ID || null;
    const pgRefNum = decoded.PG_REF_NUM || null;
    const gatewayRef = txnId || pgRefNum || orderId;

    const utr = decoded.RRN || decoded.utr || null;
    const amountPaisa = decoded.AMOUNT != null ? Number(decoded.AMOUNT) : null;
    const amountINR =
      amountPaisa != null ? Number((amountPaisa / 100).toFixed(2)) : null;

    const rawStatus = String(decoded.STATUS || "").toUpperCase();
    const responseCode = String(decoded.RESPONSE_CODE || "");
    const isFinal = String(decoded.IS_STATUS_FINAL || "").toUpperCase();

    let ourStatus = PayInRequestStatus.PENDING;
    let webhookStatus = WebhookStatus.PENDING;
    let failureReason = null;
    let failureCode = null;

    const isSuccess =
      responseCode === "000" &&
      ["APPROVED", "CAPTURED", "SUCCESS"].includes(rawStatus);
    const isFailure =
      ["FAILED", "DECLINED", "REJECT", "REJECTED", "CANCELLED"].includes(
        rawStatus,
      ) || (isFinal === "Y" && !isSuccess);

    if (isSuccess) {
      ourStatus = PayInRequestStatus.COMPLETED;
      webhookStatus = WebhookStatus.SUCCESS;
    } else if (isFailure) {
      ourStatus = PayInRequestStatus.FAILED;
      webhookStatus = WebhookStatus.FAILED;
      failureReason =
        decoded.PG_TXN_MESSAGE ||
        decoded.RESPONSE_MESSAGE ||
        `Payment ${rawStatus}`;
      failureCode = rawStatus || responseCode || "FAILED";
    } else {
      // Sent to Bank / Pending / non-final
      ourStatus = PayInRequestStatus.PROCESSING;
      webhookStatus = WebhookStatus.PENDING;
    }

    return this._buildResponse({
      decoded,
      ourStatus,
      webhookStatus,
      failureReason,
      failureCode,
      merchantReference: orderId,
      gatewayReference: gatewayRef,
      utr,
      amountINR,
    });
  }

  _buildResponse({
    decoded,
    ourStatus,
    webhookStatus,
    failureReason = null,
    failureCode = null,
    merchantReference = null,
    gatewayReference = null,
    utr = null,
    amountINR = null,
  }) {
    const orderId =
      merchantReference ||
      decoded.ORDER_ID ||
      decoded.orderid ||
      null;
    const txnId = decoded.TXN_ID || null;
    const pgRef = decoded.PG_REF_NUM || null;
    const gatewayRef = gatewayReference || txnId || pgRef || orderId;
    const amt =
      amountINR != null
        ? amountINR
        : decoded.AMOUNT != null
        ? Number((Number(decoded.AMOUNT) / 100).toFixed(2))
        : 0;

    return {
      merchantReference: orderId,
      gatewayReference: gatewayRef,
      gatewayId: 3, // Pay10
      isPayout: false,
      status: ourStatus,
      failureReason,
      failureCode,
      utr: utr || decoded.RRN || null,
      amount: amt,
      paymentMode: "UPI_INTENT",
      metadata: {
        event: "Pay10_PAYIN_CALLBACK",
        pay10Status: decoded.STATUS || null,
        responseCode: decoded.RESPONSE_CODE || null,
        responseMessage: decoded.RESPONSE_MESSAGE || null,
        txnId,
        pgRefNum: pgRef,
        payerName: decoded.PAYER_NAME || null,
        payerAddress: decoded.PAYER_ADDRESS || null,
        qrString: decoded.QRSTRING || null,
        isStatusFinal: decoded.IS_STATUS_FINAL || null,
        rrn: decoded.RRN || null,
        rawDecoded: decoded,
      },
      webhookData: {
        payload: {
          responseLog: decoded,
          orderId,
          txnId,
          utr: utr || decoded.RRN || null,
        },
        transactionId: orderId,
        amount: amt || 0,
        status: webhookStatus,
        eventType: WebhookEventType.PAY_IN_STATUS_UPDATE,
        utr: utr || decoded.RRN || null,
      },
    };
  }

  _buildErrorResponse(payload, message) {
    return {
      merchantReference: null,
      gatewayReference: null,
      gatewayId: 3, // Pay10
      isPayout: false,
      status: PayInRequestStatus.PENDING,
      failureReason: message,
      failureCode: "WEBHOOK_PROCESSING_ERROR",
      utr: null,
      amount: null,
      metadata: { error: message, rawPayload: payload },
      webhookData: {
        payload: { responseLog: payload, error: message },
        transactionId: "UNKNOWN",
        amount: 0,
        status: WebhookStatus.FAILED,
        eventType: WebhookEventType.PAY_IN_STATUS_UPDATE,
        utr: null,
      },
    };
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
}

module.exports = new Pay10Webhook();