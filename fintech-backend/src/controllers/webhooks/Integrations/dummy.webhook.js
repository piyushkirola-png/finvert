const {
  PayInRequestStatus,
  PayOutRequestStatus,
  RefundStatus,
  ChargebackStatus,
  WebhookStatus,
  WebhookEventType,
} = require("@prisma/client");
const prisma = require("../../../../config/prisma");

const CHARGEBACK_REASON_MAP = {
  fraudulent: "FRAUDULENT",
  duplicate: "DUPLICATE",
  product_not_received: "PRODUCT_NOT_RECEIVED",
  service_not_provided: "SERVICE_NOT_PROVIDED",
  unauthorized: "UNAUTHORIZED",
  technical_issue: "TECHNICAL_ISSUE",
  customer_dispute: "CUSTOMER_DISPUTE",
  cancelled: "CANCELLED",
  other: "OTHER",
};

function mapChargebackReason(raw) {
  if (!raw) return "CUSTOMER_DISPUTE";
  return (
    CHARGEBACK_REASON_MAP[String(raw).toLowerCase().trim()] ||
    "CUSTOMER_DISPUTE"
  );
}

class DummyWebhook {
  async process(payload, headers) {
    console.log("[Dummy Webhook] Received:", JSON.stringify(payload, null, 2));

    try {
      const event = payload?.event || payload?.type || null;

      // ============ PAYIN EVENTS ============
      if (
        event === "PAYIN_SUCCESS" ||
        event === "PAYIN_FAILED" ||
        event === "PAYIN_PENDING" ||
        event === "PAYMENT_SUCCESS" ||
        event === "PAYMENT_FAILED"
      ) {
        return await this.handlePayin(payload, headers);
      }

      // ============ REFUND EVENTS ============
      if (
        event === "REFUND_SUCCESS" ||
        event === "REFUND_FAILED" ||
        event === "REFUND_CREATED"
      ) {
        return await this.handleRefund(payload, headers);
      }

      // ============ CHARGEBACK EVENTS ============
      if (
        event === "CHARGEBACK_CREATED" ||
        event === "CHARGEBACK_REVERSED" ||
        event === "CHARGEBACK_RESOLVED" ||
        event === "DISPUTE_OPENED"
      ) {
        return await this.handleChargeback(payload, headers);
      }

      // ============ PAYOUT EVENTS (existing behaviour) ============
      return await this.handlePayout(payload, headers);
    } catch (error) {
      console.error("[Dummy Webhook] Error processing:", error);
      return {
        merchantReference:
          payload?.reference_id || payload?.merchantReference || null,
        gatewayReference:
          payload?.transfer_id || payload?.gatewayReference || null,
        gatewayId: 19,
        status: PayOutRequestStatus.PENDING,
        failureReason: error.message,
        failureCode: "WEBHOOK_PROCESSING_ERROR",
        utr: null,
        amount: payload?.transfer_amount || payload?.amount || null,
        metadata: { error: error.message, rawPayload: payload },
      };
    }
  }

  // ---------------- PAYIN ----------------
  async handlePayin(payload, headers) {
    const dummyPayin = require("../../payin-requests/IntegrationServices/DummyIntegration/DummyIntegrationService.service");

    // Optional signature check (soft in dev)
    const skipVerify = process.env.NODE_ENV !== "production";
    const signature =
      headers["x-dummy-signature"] || headers["x-webhook-signature"];
    if (!skipVerify && signature && dummyPayin.verifyWebhookSignature) {
      if (!dummyPayin.verifyWebhookSignature(payload, signature)) {
        console.warn("[Dummy Webhook] Invalid payin signature");
      }
    }

    const event = payload?.event || payload?.type || "";
    const merchantReference =
      payload?.reference_id ||
      payload?.merchantReference ||
      payload?.data?.reference_id ||
      null;
    const gatewayReference =
      payload?.gateway_reference ||
      payload?.gatewayReference ||
      payload?.data?.gateway_reference ||
      null;
    const utr = payload?.utr || payload?.bank_reference || null;
    const amount = payload?.amount ?? payload?.data?.amount ?? null;

    let status = PayInRequestStatus.PENDING;
    if (
      event === "PAYIN_SUCCESS" ||
      event === "PAYMENT_SUCCESS" ||
      payload?.status === "SUCCESS"
    ) {
      status = PayInRequestStatus.COMPLETED;
    } else if (
      event === "PAYIN_FAILED" ||
      event === "PAYMENT_FAILED" ||
      payload?.status === "FAILED"
    ) {
      status = PayInRequestStatus.FAILED;
    }

    return {
      merchantReference,
      gatewayReference,
      gatewayId: 19,
      status,
      failureReason: payload?.failure_reason || null,
      failureCode: payload?.failure_code || null,
      utr,
      amount: amount != null ? Number(amount) : null,
      metadata: {
        event,
        rawPayload: payload,
      },
    };
  }

  // ---------------- REFUND ----------------
  async handleRefund(payload, headers) {
    const event = payload?.event || payload?.type || "";
    const refundLocalId =
      payload?.refund_local_id ?? payload?.data?.refund_local_id ?? null;
    const merchantReference =
      payload?.reference_id ?? payload?.data?.reference_id ?? null;
    const gatewayRefundId =
      payload?.gateway_refund_id ?? payload?.data?.gateway_refund_id ?? null;
    const amount =
      payload?.refund_amount ?? payload?.data?.refund_amount ?? null;

    let mappedStatus =
      event === "REFUND_SUCCESS" || payload?.status === "SUCCESS"
        ? RefundStatus.COMPLETED
        : event === "REFUND_FAILED" || payload?.status === "FAILED"
          ? RefundStatus.FAILED
          : RefundStatus.PENDING;

    return {
      merchantReference,
      gatewayReference: gatewayRefundId,
      gatewayId: 19,
      status: mappedStatus,
      failureReason: payload?.failure_reason || null,
      failureCode: payload?.failure_code || null,
      utr: null,
      amount: amount != null ? Number(amount) : null,
      isRefund: true,
      refundId: refundLocalId ? Number(refundLocalId) : null,
      metadata: {
        event,
        gatewayRefundId,
        rawPayload: payload,
      },
    };
  }

  // ---------------- CHARGEBACK ----------------
  async handleChargeback(payload, headers) {
    const event = payload?.event || payload?.type || "";
    const merchantReference =
      payload?.reference_id ?? payload?.data?.reference_id ?? null;
    const gatewayChargebackId =
      payload?.chargeback_id ??
      payload?.gateway_chargeback_id ??
      payload?.data?.chargeback_id ??
      null;
    const amount = payload?.amount ?? payload?.data?.amount ?? null;

    const dummyChargeback = require("../../chargebacks/IntegrationServices/DummyIntegration/DummyIntegrationService.service");
    const skipVerify = process.env.NODE_ENV !== "production";
    const signature =
      headers["x-dummy-signature"] || headers["x-webhook-signature"];
    if (
      !skipVerify &&
      signature &&
      dummyChargeback.verifyWebhookSignature &&
      !dummyChargeback.verifyWebhookSignature(payload, signature)
    ) {
      console.warn("[Dummy Webhook] Invalid chargeback signature");
    }

    const isReversed =
      event === "CHARGEBACK_REVERSED" || payload?.status === "REVERSED";

    return {
      merchantReference,
      gatewayReference: gatewayChargebackId,
      gatewayId: 19,
      status: isReversed
        ? PayInRequestStatus.COMPLETED
        : PayInRequestStatus.FAILED,
      failureReason: null,
      failureCode: null,
      reason: mapChargebackReason(payload?.reason),
      reasonDescription: payload?.reason_description || null,
      utr: null,
      amount: amount != null ? Number(amount) : null,
      isChargeback: true,
      chargebackId: gatewayChargebackId,
      metadata: {
        event,
        gatewayChargebackId,
        reason: payload?.reason,
        status: payload?.status,
        rawPayload: payload,
      },
    };
  }

  // ---------------- PAYOUT (existing) ----------------
  async handlePayout(payload, headers) {
    const dummyService = require("../../payout-requests/IntegrationServices/DummyIntegration/DummyIntegrationService.service");

    const skipVerification = process.env.NODE_ENV !== "production";
    const signature =
      headers["x-dummy-signature"] ||
      headers["X-Dummy-Signature"] ||
      headers["x-webhook-signature"];

    if (!skipVerification && signature) {
      const isValid = dummyService.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        console.warn("[Dummy Webhook] Invalid payout signature");
      }
    }

    const eventType = payload?.event || payload?.type || null;
    const data =
      payload?.data && typeof payload.data === "object"
        ? payload.data
        : payload;

    const transferId = data.transfer_id || payload.transfer_id || null;
    const referenceId = data.reference_id || payload.reference_id || null;
    const rawStatus = data.transfer_status || payload.transfer_status || null;
    const bankReference = data.bank_reference || payload.bank_reference || null;
    const amount = data.transfer_amount ?? payload.transfer_amount ?? null;
    const failureReason = data.failure_reason || payload.failure_reason || null;
    const failureCode = data.failure_code || payload.failure_code || null;

    let status = dummyService.mapPayoutStatus(rawStatus);
    if (eventType === "PAYOUT_SUCCESS" || eventType === "TRANSFER_SUCCESS") {
      status = PayOutRequestStatus.COMPLETED;
    } else if (
      eventType === "PAYOUT_FAILED" ||
      eventType === "TRANSFER_FAILED"
    ) {
      status = PayOutRequestStatus.FAILED;
    } else if (
      eventType === "PAYOUT_PENDING" ||
      eventType === "TRANSFER_PENDING"
    ) {
      status = PayOutRequestStatus.PENDING;
    }

    let webhookStatus = WebhookStatus.PENDING;
    if (status === PayOutRequestStatus.COMPLETED)
      webhookStatus = WebhookStatus.SUCCESS;
    else if (status === PayOutRequestStatus.FAILED)
      webhookStatus = WebhookStatus.FAILED;

    return {
      merchantReference: referenceId,
      gatewayReference: transferId,
      gatewayId: 19,
      isPayout: true,
      status,
      failureReason,
      failureCode,
      utr: bankReference,
      amount: amount !== null ? Number(amount) : null,
      metadata: {
        transferId,
        reference_id: referenceId,
        status: rawStatus,
        amount,
        utr: bankReference,
        rawPayload: payload,
      },
      webhookData: {
        payload: {
          responseLog: payload,
          merchantReference: referenceId,
          transferId,
        },
        transactionId: referenceId || transferId || "UNKNOWN",
        amount: Number(amount) || 0,
        status: webhookStatus,
        eventType: WebhookEventType.PAY_OUT_STATUS_UPDATE,
        utr: bankReference,
      },
    };
  }
}

module.exports = new DummyWebhook();
