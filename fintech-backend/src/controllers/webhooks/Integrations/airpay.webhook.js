const { PayInRequestStatus, WebhookStaatus, WebhookEventType } = require("@prisma/client");
const crypto = require("crypto");

class AirpayWebhook {
  async process(payload, headers) {
    console.log("[Airpay Webhook] Received:", JSON.stringify(payload, null, 2));

    try {
      const orderId = payload.orderid;
      const apTransactionId = payload.ap_transactionid;
      const amount = Number(payload.amount);
      const statusCode = Number(payload.transaction_status);
      const secureHash = payload.ap_SecureHash;
      const message = payload.message || "";
      const customerVpa = payload.customer_vpa || "";
      
      // ============================================================
      // TODO: REPLACE WITH AIRPAY'S EXACT SECURE HASH VERIFICATION
      // ============================================================
      // const expectedHash = crypto.createHash('...').update(...).digest('hex');
      // if (secureHash !== expectedHash) {
      //   throw new Error("Invalid Airpay Secure Hash");
      // }
      console.log("[Airpay Webhook] Skipping hash verification (stub)");
      // ============================================================

      let ourStatus = PayInRequestStatus.PENDING;
      let webhookStatus = WebhookStatus.PENDING;
      let failureReason = null;

      switch (statusCode) {
        case 200:
          ourStatus = PayInRequestStatus.COMPLETED;
          webhookStatus = WebhookStatus.SUCCESS;
          break;
        case 400:
        case 401:
        case 402:
        case 405:
        case 503:
          ourStatus = PayInRequestStatus.FAILED;
          webhookStatus = WebhookStatus.FAILED;
          failureReason = message || "Payment failed";
          break;
        case 211:
          ourStatus = PayInRequestStatus.PROCESSING;
          webhookStatus = WebhookStatus.PENDING;
          break;
        default:
          ourStatus = PayInRequestStatus.PENDING;
          webhookStatus = WebhookStatus.PENDING;
      }

      const utr = payload.rrn || payload.token || null;

      return {
        merchantReference: orderId,
        gatewayReference: apTransactionId,
        gatewayId: 2, // Airpay
        isPayout: false,
        status: ourStatus,
        failureReason,
        failureCode: statusCode !== 200 ? String(statusCode) : null,
        utr,
        amount,
        paymentMode: "UPI_INTENT",
        metadata: {
          event: "AIRPAY_PAYIN_CALLBACK",
          transaction_status: statusCode,
          message,
          customer_vpa: customerVpa,
          chmod: payload.chmod,
          bank_name: payload.bank_name,
          rawPayload: payload,
        },
        webhookData: {
          payload: {
            responseLog: payload,
            orderId,
            apTransactionId,
            utr,
          },
          transactionId: orderId,
          amount: amount || 0,
          status: webhookStatus,
          eventType: WebhookEventType.PAY_IN_STATUS_UPDATE,
          utr,
        },
      };

    } catch (error) {
      console.error("[Airpay Webhook] Error:", error);
      return {
        merchantReference: null,
        gatewayReference: null,
        gatewayId: 2,
        isPayout: false,
        status: PayInRequestStatus.PENDING,
        failureReason: error.message,
        failureCode: "WEBHOOK_PROCESSING_ERROR",
        utr: null,
        amount: null,
        metadata: { error: error.message, rawPayload: payload },
        webhookData: {
          payload: { responseLog: payload, error: error.message },
          transactionId: "UNKNOWN",
          amount: 0,
          status: WebhookStatus.FAILED,
          eventType: WebhookEventType.PAY_IN_STATUS_UPDATE,
          utr: null,
        },
      };
    }
  }
}

module.exports = new AirpayWebhook();