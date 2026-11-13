const {
  PayInRequestStatus,
  PayOutRequestStatus,
  WebhookStatus,
  WebhookEventType,
} = require("@prisma/client");

class FiatPayWebhook {
  async process(payload, headers) {
    console.log(
      "[FiatPay Webhook] Received:",
      JSON.stringify(payload, null, 2),
    );

    try {
      const isPayout =
        payload.order_id !== undefined ||
        payload.utr_no !== undefined ||
        (payload.payer_info === undefined &&
          payload.orderid === undefined);

      if (isPayout) {
        return this._processPayoutCallback(payload, headers);
      }

      return this._processPayinCallback(payload, headers);
    } catch (error) {
      console.error("[FiatPay Webhook] Dispatch error:", error);
      return {
        merchantReference: null,
        gatewayReference: null,
        gatewayId: 1,
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

  _processPayinCallback(payload, headers) {
    try {
      const orderId =
        payload.orderid ||
        payload.order_id ||
        payload.merchantReference ||
        null;

      const apiTxnId =
        payload.api_txnid || payload.gatewayReference || null;

      const utr = payload.utr || null;
      const amount =
        payload.amount != null ? Number(payload.amount) : null;
      const rawStatus = String(payload.status || "").toUpperCase();

      let ourStatus = PayInRequestStatus.PENDING;
      let webhookStatus = WebhookStatus.PENDING;
      let failureReason = null;
      let failureCode = null;

      switch (rawStatus) {
        case "SUCCESS":
          ourStatus = PayInRequestStatus.COMPLETED;
          webhookStatus = WebhookStatus.SUCCESS;
          break;

        case "FAILED":
        case "REJECT":
          ourStatus = PayInRequestStatus.FAILED;
          webhookStatus = WebhookStatus.FAILED;
          failureReason = payload.message || `Payment ${rawStatus}`;
          failureCode = rawStatus;
          break;

        case "PENDING":
        case "CREATED":
          ourStatus = PayInRequestStatus.PROCESSING;
          webhookStatus = WebhookStatus.PENDING;
          break;

        default:
          ourStatus = PayInRequestStatus.PENDING;
          webhookStatus = WebhookStatus.PENDING;
      }

      return {
        merchantReference: orderId,
        gatewayReference: apiTxnId,
        gatewayId: 1,
        isPayout: false,
        status: ourStatus,
        failureReason,
        failureCode,
        utr,
        amount,
        paymentMode: "UPI_INTENT",
        metadata: {
          event: "FiatPay_PAYIN_CALLBACK",
          fiatpayStatus: rawStatus,
          api_txnid: apiTxnId,
          payer_info: payload.payer_info || null,
          charges: payload.charges ?? null,
          message: payload.message || null,
          utr: utr || null,
          rawPayload: payload,
        },
        webhookData: {
          payload: {
            responseLog: payload,
            orderId,
            apiTxnId,
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
      console.error("[FiatPay Webhook] Payin parse error:", error);
      return {
        merchantReference: null,
        gatewayReference: null,
        gatewayId: 1,
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

  _processPayoutCallback(payload, headers) {
    try {
      const orderId =
        payload.order_id ||
        payload.orderid ||
        payload.reference_id ||
        null;

      const apiTxnId = payload.api_txnid || null;
      const utr = payload.utr || payload.utr_no || null;
      const amount =
        payload.amount != null ? Number(payload.amount) : null;
      const rawStatus = String(payload.status || "").toUpperCase();

      let ourStatus = PayOutRequestStatus.PENDING;
      let webhookStatus = WebhookStatus.PENDING;
      let failureReason = null;
      let failureCode = null;

      switch (rawStatus) {
        case "SUCCESS":
          ourStatus = PayOutRequestStatus.COMPLETED;
          webhookStatus = WebhookStatus.SUCCESS;
          break;

        case "FAILED":
        case "REJECT":
        case "REFUNDED":
          ourStatus = PayOutRequestStatus.FAILED;
          webhookStatus = WebhookStatus.FAILED;
          failureReason = payload.message || `Payout ${rawStatus}`;
          failureCode = rawStatus;
          break;

        case "PENDING":
        case "CREATED":
          ourStatus = PayOutRequestStatus.PENDING;
          webhookStatus = WebhookStatus.PENDING;
          break;

        default:
          ourStatus = PayOutRequestStatus.PENDING;
          webhookStatus = WebhookStatus.PENDING;
      }

      return {
        merchantReference: orderId,
        gatewayReference: apiTxnId,
        gatewayId: 1,
        isPayout: true,
        status: ourStatus,
        failureReason,
        failureCode,
        utr,
        amount,
        metadata: {
          event: "FiatPay_PAYOUT_CALLBACK",
          fiatpayStatus: rawStatus,
          api_txnid: apiTxnId,
          charges: payload.charges ?? null,
          message: payload.message || null,
          rawPayload: payload,
          utr,
        },
        webhookData: {
          payload: {
            responseLog: payload,
            orderId,
            apiTxnId,
            utr,
          },
          transactionId: orderId,
          amount: amount || 0,
          status: webhookStatus,
          eventType: WebhookEventType.PAY_OUT_STATUS_UPDATE,
          utr,
        },
      };
    } catch (error) {
      console.error("[FiatPay Webhook] Payout parse error:", error);
      return {
        merchantReference: null,
        gatewayReference: null,
        gatewayId: 1,
        isPayout: true,
        status: PayOutRequestStatus.PENDING,
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
          eventType: WebhookEventType.PAY_OUT_STATUS_UPDATE,
          utr: null,
        },
      };
    }
  }
}

module.exports = new FiatPayWebhook();