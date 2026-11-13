const {
  WebhookStatus,
  PayInRequestStatus,
  PayOutRequestStatus,
  WebhookEventType,
  ChargebackStatus,
  RefundStatus,
} = require("@prisma/client");
const crypto = require("crypto");
const prisma = require("../../../config/prisma");
const auditLogService = require("../../services/audit-log.service");

// Import webhook handlers
const fiatPayWebhook = require("./Integrations/fiatpay.webhook");
const airpayWebhook = require("./Integrations/airpay.webhook");
const pay10Webhook = require("./Integrations/pay10.webhook");
const dummyWebhook = require("./Integrations/dummy.webhook");

const payInRequestsService = require("../payin-requests/payin-requests.service");
const payOutRequestsService = require("../payout-requests/payout-requests.service");

const WEBHOOK_LOCK_TTL_MS = 10000;
const inFlightWebhooks = new Map();

function acquireWebhookLock(key) {
  const now = Date.now();
  const exp = inFlightWebhooks.get(key);
  if (exp && exp > now) return false;
  inFlightWebhooks.set(key, now + WEBHOOK_LOCK_TTL_MS);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of inFlightWebhooks)
    if (exp <= now) inFlightWebhooks.delete(k);
}, 30000).unref();

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
    {
      timeout: 30000,
      maxWait: 10000,
    },
  );
}

// Map gateway name to gateway ID
const getGatewayIdFromName = (gatewayName) => {
  switch (gatewayName.toLowerCase()) {
    case "switch":
      return 1;
    case "airpay":
      return 2;
    case "pay10":
      return 3;
    case "dummy":
      return 19;
    default:
      return null;
  }
};

class WebhookService {
  /**
   * Process incoming webhook with VALIDATION
   */
  async processWebhook(gatewayName, payload, headers) {
    if (!payload || typeof payload !== "object") {
      throw new Error(`Invalid payload received for gateway: ${gatewayName}`);
    }

    const rawEventId =
      payload.id ||
      payload.event_id ||
      payload.eventId ||
      payload.data?.id ||
      payload.data?.payment?.payment_id ||
      payload.payload?.payment?.entity?.id ||
      payload.notificationItems?.[0]?.NotificationRequestItem?.pspReference ||
      payload?.content?.payment?.id ||
      payload?.webhook?.id ||
      null;

    const eventId =
      rawEventId !== undefined && rawEventId !== null && rawEventId !== ""
        ? String(rawEventId)
        : null;

    const gatewayId = getGatewayIdFromName(gatewayName);

    const transactionId =
      payload.data?.order?.order_id ||
      payload.data?.payment?.payment_id ||
      payload.order_id ||
      payload.payment_id ||
      payload.reference_id ||
      payload.data?.reference_id;

    // ========== SHORT LOCK ONLY FOR DUPLICATE CHECK ==========
    const lockIdentifier = transactionId || eventId;
    const evt = String(payload.event || payload.type || "");
    const family = /REFUND/i.test(evt)
      ? "refund"
      : /CHARGEBACK|DISPUTE/i.test(evt)
        ? "chargeback"
        : "payment";
    const lockKey = lockIdentifier
      ? `${gatewayName}:${family}:${lockIdentifier}`
      : null;

    if (lockKey && !acquireWebhookLock(lockKey)) {
      console.log(`[Webhook] Blocked duplicate webhook for ${lockKey}`);
      return { success: true, duplicate: true };
    }

    try {
      return await this.processWebhookLocked(
        gatewayName,
        payload,
        headers,
        eventId,
        transactionId,
        gatewayId,
      );
    } catch (err) {
      if (lockKey) inFlightWebhooks.delete(lockKey);
      throw err;
    }

    // HEAVY PROCESSING OUTSIDE THE LOCK
    return this.processWebhookLocked(
      gatewayName,
      payload,
      headers,
      eventId,
      transactionId,
      gatewayId,
    );
  }

  async processWebhookLocked(
    gatewayName,
    payload,
    headers,
    eventId,
    transactionId,
    gatewayId,
  ) {
    let attempts = 3;
    let lastError = null;

    while (attempts > 0) {
      try {
        const webhookLog = await prisma.inboundLog.create({
          data: {
            requestBody: payload,
            requestHeaders: headers,
            eventId: eventId ? String(eventId) : null,
            gatewayId: gatewayId || null,
            status: WebhookStatus.PROCESSING,
            createdAt: new Date(),
          },
        });

        await auditLogService.logWebhookReceived(
          gatewayName,
          eventId || "unknown",
          { eventId, transactionId },
        );

        try {
          let processedData;

          switch (gatewayName.toLowerCase()) {
            case "switch":
              processedData = await fiatPayWebhook.process(payload, headers);
              break;
            case "airpay":
              processedData = await airpayWebhook.process(payload, headers);
              break;
            case "pay10":
              processedData = await pay10Webhook.process(payload, headers);
              break;
            case "dummy":
              processedData = await dummyWebhook.process(payload, headers);
              break;
            default:
              throw new Error(`Unknown gateway: ${gatewayName}`);
          }

          if (processedData.failureCode === "INVALID_PAYMENT_STATUS") {
            console.error(
              `[Webhook Service] Validation failed: ${processedData.failureReason}`,
            );

            await prisma.inboundLog.update({
              where: { id: webhookLog.id },
              data: {
                status: WebhookStatus.FAILED,
                responseBody: {
                  error: processedData.failureReason,
                  failureCode: processedData.failureCode,
                  currentStatus: processedData.metadata?.currentStatus,
                  expectedStatus: processedData.metadata?.expectedStatus,
                },
                processedAt: new Date(),
              },
            });

            return {
              success: false,
              error: processedData.failureReason,
              failureCode: processedData.failureCode,
            };
          }

          // HANDLE CHARGEBACK
          if (processedData.isChargeback) {
            if (processedData.failureReason) {
              console.error(
                `[Webhook Service] Chargeback error: ${processedData.failureReason}`,
              );
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.FAILED,
                  responseBody: { error: processedData.failureReason },
                  processedAt: new Date(),
                },
              });
              return { success: false, error: processedData.failureReason };
            }

            await this.handleChargebackWebhook(
              processedData,
              gatewayName,
              webhookLog,
            );
            return { success: true };
          }

          // HANDLE REFUND
          if (processedData.isRefund) {
            if (processedData.failureReason) {
              console.error(
                `[Webhook Service] Refund error: ${processedData.failureReason}`,
              );
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.FAILED,
                  responseBody: { error: processedData.failureReason },
                  processedAt: new Date(),
                },
              });
              return { success: false, error: processedData.failureReason };
            }

            await this.handleRefundWebhook(
              processedData,
              gatewayName,
              webhookLog,
            );
            return { success: true };
          }

          if (processedData.isPayout === true) {
            const payoutRequest = await prisma.payOutRequest.findFirst({
              where: {
                OR: [
                  { merchantReference: processedData.merchantReference },
                  { gatewayReference: processedData.gatewayReference },
                ],
              },
              orderBy: { id: "desc" },
            });

            if (!payoutRequest) {
              console.log(
                `[Webhook] Payout not found for: ${processedData.merchantReference || processedData.gatewayReference}`,
              );
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.ACKNOWLEDGED,
                  responseBody: {
                    message: "Payout webhook acknowledged - no matching payout",
                    merchantReference: processedData.merchantReference,
                  },
                  processedAt: new Date(),
                },
              });
              return { success: true, acknowledged: true };
            }

            // Gateway ID check
            const expectedPayoutGatewayId = getGatewayIdFromName(gatewayName);
            if (
              expectedPayoutGatewayId !== null &&
              payoutRequest.gatewayId !== expectedPayoutGatewayId
            ) {
              console.warn(
                `[Webhook] Payout gateway mismatch: req=${payoutRequest.gatewayId}, webhook=${expectedPayoutGatewayId} (${gatewayName})`,
              );
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.ACKNOWLEDGED,
                  responseBody: {
                    message: "Payout gateway mismatch - ignored",
                    expectedGatewayId: expectedPayoutGatewayId,
                    actualGatewayId: payoutRequest.gatewayId,
                  },
                  processedAt: new Date(),
                },
              });
              return { success: true, acknowledged: true };
            }

            if (processedData.status === PayOutRequestStatus.COMPLETED) {
              await payOutRequestsService.onPayoutRequestCompleted(
                { id: payoutRequest.id },
                {
                  utr: processedData.utr,
                  metadata: processedData.metadata,
                },
              );
            } else if (processedData.status === PayOutRequestStatus.FAILED) {
              await payOutRequestsService.onPayoutRequestFailed(
                { id: payoutRequest.id },
                {
                  failureReason: processedData.failureReason,
                  failureCode: processedData.failureCode,
                },
              );
            } else {
              // PENDING — nothing to settle
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  gatewayId: payoutRequest.gatewayId,
                  merchantId: payoutRequest.merchantId,
                  eventType: WebhookEventType.PAY_OUT_STATUS_UPDATE,
                  status: WebhookStatus.SUCCESS,
                  responseBody: {
                    success: true,
                    message: "Payout still pending",
                  },
                  processedAt: new Date(),
                },
              });
              return { success: true };
            }

            await prisma.inboundLog.update({
              where: { id: webhookLog.id },
              data: {
                gatewayId: payoutRequest.gatewayId,
                merchantId: payoutRequest.merchantId,
                eventType: WebhookEventType.PAY_OUT_STATUS_UPDATE,
                status: WebhookStatus.SUCCESS,
                utr: processedData.utr,
                amount: Number(payoutRequest.amount),
                responseStatus: 200,
                responseBody: { success: true, processed: true },
                processedAt: new Date(),
              },
            });

            await auditLogService.log({
              action: "WEBHOOK_PROCESSED",
              resource: "Webhook",
              userId: null,
              merchantId: payoutRequest.merchantId,
              requestId: payoutRequest.id,
              description: `Payout webhook from ${gatewayName} processed for request ${payoutRequest.id}`,
              status: "SUCCESS",
              details: {
                eventId,
                transactionId,
                gateway: gatewayName,
                merchantReference: processedData.merchantReference,
                payoutStatus: processedData.status,
              },
            });

            return { success: true };
          }

          // HANDLE PAYMENT
          if (
            processedData.merchantReference ||
            processedData.gatewayReference
          ) {
            const payInRequest = await prisma.payInRequest.findFirst({
              where: {
                OR: [
                  { merchantReference: processedData.merchantReference },
                  { gatewayReference: processedData.gatewayReference },
                ],
              },
              orderBy: { id: "desc" },
            });

            console.log(
              `[Webhook] Fetched request ID: ${payInRequest?.id}, GatewayID: ${payInRequest?.gatewayId}`,
            );

            if (!payInRequest) {
              console.log(
                `[Webhook] No matching pay-in request found for: ${
                  processedData.merchantReference ||
                  processedData.gatewayReference
                }`,
              );

              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.ACKNOWLEDGED,
                  responseBody: {
                    message:
                      "Webhook acknowledged - no matching pay-in request found",
                    merchantReference: processedData.merchantReference,
                    gatewayReference: processedData.gatewayReference,
                  },
                  processedAt: new Date(),
                },
              });

              await auditLogService.log({
                action: "WEBHOOK_ACKNOWLEDGED",
                resource: "Webhook",
                userId: null,
                description: `Webhook from ${gatewayName} acknowledged - no matching request`,
                status: "ACKNOWLEDGED",
                details: {
                  eventId,
                  transactionId,
                  gateway: gatewayName,
                  merchantReference: processedData.merchantReference,
                },
              });

              return { success: true, acknowledged: true };
            }

            // VALIDATION 1: GATEWAY ID MUST MATCH
            const expectedGatewayId = getGatewayIdFromName(gatewayName);
            if (payInRequest.gatewayId !== expectedGatewayId) {
              console.warn(
                `Gateway mismatch, acknowledging silently to stop retries`,
              );
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.ACKNOWLEDGED,
                  responseBody: { message: "Gateway mismatch - ignored" },
                  processedAt: new Date(),
                },
              });
              return { success: true, acknowledged: true };
            }

            // VALIDATION 2: AMOUNT MUST MATCH
            if (processedData.status === PayInRequestStatus.PENDING) {
              await prisma.inboundLog.update({
                where: { id: webhookLog.id },
                data: {
                  status: WebhookStatus.ACKNOWLEDGED,
                  responseBody: { message: "Acknowledged PENDING state" },
                  processedAt: new Date(),
                },
              });
              return { success: true, acknowledged: true };
            }

            if (processedData.status === PayInRequestStatus.COMPLETED) {
              // if (processedData.status === PayInRequestStatus.COMPLETED) {
              const webhookAmount = Number(processedData.amount);
              const requestAmount = Number(payInRequest.amount);

              if (webhookAmount !== requestAmount) {
                const errorMsg = `AMOUNT MISMATCH: Webhook amount ${webhookAmount} does not match request amount ${requestAmount}`;
                console.error(errorMsg);

                await prisma.inboundLog.update({
                  where: { id: webhookLog.id },
                  data: {
                    status: WebhookStatus.FAILED,
                    responseBody: { error: errorMsg },
                    processedAt: new Date(),
                  },
                });
                throw new Error(errorMsg);
              }

              await payInRequestsService.onPayInRequestCompleted({
                id: payInRequest.id,
                metadata: processedData.metadata,
              });
            } else if (processedData.status === PayInRequestStatus.FAILED) {
              await payInRequestsService.onPayInRequestFailed({
                id: payInRequest.id,
                failureReason: processedData.failureReason,
                failureCode: processedData.failureCode,
                metadata: processedData.metadata,
              });
            }

            await prisma.inboundLog.update({
              where: { id: webhookLog.id },
              data: {
                gatewayId: payInRequest.gatewayId,
                merchantId: payInRequest.merchantId,
                eventType: WebhookEventType.PAY_IN_STATUS_UPDATE,
                status: WebhookStatus.SUCCESS,
                processedAt: new Date(),
                utr: processedData.utr,
                amount: Number(payInRequest.amountInINR || payInRequest.amount),
                responseStatus: 200,
                responseBody: { success: true, processed: true },
              },
            });

            await auditLogService.log({
              action: "WEBHOOK_PROCESSED",
              resource: "Webhook",
              userId: null,
              merchantId: payInRequest.merchantId,
              requestId: payInRequest.id,
              description: `Webhook from ${gatewayName} processed successfully for request ${payInRequest.id}`,
              status: "SUCCESS",
              details: {
                eventId,
                transactionId,
                gateway: gatewayName,
                merchantReference: processedData.merchantReference,
                status: processedData.status,
              },
            });

            return { success: true };
          } else {
            await prisma.inboundLog.update({
              where: { id: webhookLog.id },
              data: {
                status: WebhookStatus.ACKNOWLEDGED,
                responseBody: {
                  message:
                    "Webhook acknowledged but no action taken - missing reference",
                },
                processedAt: new Date(),
              },
            });

            await auditLogService.log({
              action: "WEBHOOK_ACKNOWLEDGED",
              resource: "Webhook",
              userId: null,
              description: `Webhook from ${gatewayName} acknowledged - missing reference`,
              status: "ACKNOWLEDGED",
              details: {
                eventId,
                transactionId,
                gateway: gatewayName,
              },
            });
          }

          return { success: true };
        } catch (error) {
          console.error(`Webhook processing error for ${gatewayName}:`, error);
          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.FAILED,
              responseBody: { error: error.message },
              processedAt: new Date(),
            },
          });

          await auditLogService.log({
            action: "WEBHOOK_ERROR",
            resource: "Webhook",
            userId: null,
            description: `Webhook from ${gatewayName} failed: ${error.message}`,
            status: "ERROR",
            details: {
              eventId,
              transactionId,
              gateway: gatewayName,
              error: error.message,
            },
          });

          throw error;
        }
      } catch (error) {
        lastError = error;

        if (error.code === "P2024") {
          attempts--;
          const delay = (4 - attempts) * 500;
          console.log(
            `[Webhook] DB busy, retrying in ${delay}ms... (${attempts} attempts left)`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Handle chargeback webhook events
   */
  async handleChargebackWebhook(processedData, gatewayName, webhookLog) {
    try {
      const chargebacksService = require("../chargebacks/chargebacks.service");

      if (processedData.failureCode === "INVALID_PAYMENT_STATUS") {
        console.error(
          `[Webhook Service] Chargeback validation failed: ${processedData.failureReason}`,
        );
        await prisma.inboundLog.update({
          where: { id: webhookLog.id },
          data: {
            status: WebhookStatus.FAILED,
            responseBody: {
              error: processedData.failureReason,
              failureCode: processedData.failureCode,
              currentStatus: processedData.metadata?.currentStatus,
              expectedStatus: processedData.metadata?.expectedStatus,
            },
            processedAt: new Date(),
          },
        });
        return { success: false, error: processedData.failureReason };
      }

      if (processedData.alreadyProcessed) {
        await prisma.inboundLog.update({
          where: { id: webhookLog.id },
          data: {
            gatewayId: processedData.gatewayId,
            merchantId: processedData.metadata?.merchantId || undefined,
            status: WebhookStatus.SUCCESS,
            responseBody: {
              success: true,
              chargebackId: processedData.chargebackId,
              message:
                "Chargeback already created by gateway handler. No duplicate action taken.",
            },
            processedAt: new Date(),
          },
        });

        await auditLogService.log({
          action: "CHARGEBACK_ALREADY_PROCESSED",
          resource: "Chargeback",
          userId: null,
          merchantId: processedData.metadata?.merchantId,
          requestId: processedData.chargebackId,
          description: `Chargeback already processed from ${gatewayName} webhook`,
          status: "SUCCESS",
          details: {
            chargebackId: processedData.chargebackId,
            gateway: gatewayName,
          },
        });

        return;
      }

      // if (processedData.chargebackId) {
      //   const updated = await prisma.chargeback.update({
      //     where: { id: processedData.chargebackId },
      //     data: {
      //       status:
      //         processedData.status === "REVERSED"
      //           ? ChargebackStatus.REVERSED
      //           : ChargebackStatus.DISPUTED,
      //       resolvedAt: processedData.status === "REVERSED" ? new Date() : null,
      //       notes: `Updated via webhook from ${gatewayName}. Status: ${processedData.status}. Manual admin action required for wallet changes.`,
      //     },
      //   });

      //   await prisma.chargebackLog.create({
      //     data: {
      //       chargebackId: updated.id,
      //       action: "STATUS_UPDATED",
      //       statusAfter: updated.status,
      //       description: `Chargeback status updated via ${gatewayName} webhook to ${updated.status}. Wallet NOT debited - requires manual admin approval.`,
      //     },
      //   });

      //   await prisma.inboundLog.update({
      //     where: { id: webhookLog.id },
      //     data: {
      //       status: WebhookStatus.SUCCESS,
      //       responseBody: {
      //         success: true,
      //         chargebackId: updated.id,
      //         message:
      //           "Status updated. Manual admin approval required for wallet debit.",
      //       },
      //       processedAt: new Date(),
      //     },
      //   });

      //   await auditLogService.log({
      //     action: "CHARGEBACK_STATUS_UPDATED",
      //     resource: "Chargeback",
      //     userId: null,
      //     merchantId: updated.merchantId,
      //     requestId: updated.id,
      //     description: `Chargeback status updated via ${gatewayName} webhook to ${updated.status}`,
      //     status: "SUCCESS",
      //     details: {
      //       chargebackId: updated.id,
      //       status: updated.status,
      //       gateway: gatewayName,
      //     },
      //   });

      //   return;
      // }

      if (processedData.chargebackId) {
        // processedData.chargebackId is the *gateway* chargeback id (string).
        // Only update if we already know it — otherwise fall through to the
        // creation branch below so a brand-new dispute gets inserted.
        const existing = await prisma.chargeback.findFirst({
          where: { gatewayChargebackId: String(processedData.chargebackId) },
          include: { payInRequest: true },
        });

        if (existing) {
          const newStatus =
            processedData.status === "REVERSED"
              ? ChargebackStatus.REVERSED
              : ChargebackStatus.DISPUTED;

          const updated = await prisma.chargeback.update({
            where: { id: existing.id },
            data: {
              status: newStatus,
              resolvedAt:
                newStatus === ChargebackStatus.REVERSED ? new Date() : null,
              notes: `Updated via webhook from ${gatewayName}. Status: ${processedData.status}.`,
            },
          });

          // If reversed and wallet had been debited, credit it back
          if (
            newStatus === ChargebackStatus.REVERSED &&
            existing.walletDebitTransactionId
          ) {
            await prisma.$transaction(async (tx) => {
              await chargebacksService.reverseChargebackWalletDebit(
                existing.id,
                tx,
              );
            });
          }

          // Restore payin to COMPLETED on reversal
          if (
            newStatus === ChargebackStatus.REVERSED &&
            existing.payInRequest
          ) {
            await prisma.payInRequest.update({
              where: { id: existing.payInRequest.id },
              data: {
                status: PayInRequestStatus.COMPLETED,
                failureReason: null,
                failureCode: null,
              },
            });
          }

          await prisma.chargebackLog.create({
            data: {
              chargebackId: updated.id,
              action: "STATUS_UPDATED",
              statusAfter: updated.status,
              description: `Chargeback status updated via ${gatewayName} webhook to ${updated.status}.`,
            },
          });

          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.SUCCESS,
              responseBody: {
                success: true,
                chargebackId: updated.id,
                message: "Status updated",
              },
              processedAt: new Date(),
            },
          });

          await auditLogService.log({
            action: "CHARGEBACK_STATUS_UPDATED",
            resource: "Chargeback",
            userId: null,
            merchantId: updated.merchantId,
            requestId: updated.id,
            description: `Chargeback status updated via ${gatewayName} webhook to ${updated.status}`,
            status: "SUCCESS",
            details: {
              chargebackId: updated.id,
              status: updated.status,
              gateway: gatewayName,
            },
          });

          return;
        }
      }

      if (processedData.merchantReference || processedData.gatewayReference) {
        const payInRequest = await prisma.payInRequest.findFirst({
          where: {
            OR: [
              { merchantReference: processedData.merchantReference },
              { gatewayReference: processedData.gatewayReference },
            ],
          },
        });

        if (!payInRequest) {
          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.FAILED,
              responseBody: {
                error: "No matching pay-in request found for chargeback",
              },
              processedAt: new Date(),
            },
          });
          return { success: false, error: "Pay-in request not found" };
        }

        if (payInRequest.status !== PayInRequestStatus.COMPLETED) {
          const errorMsg = `Cannot create chargeback. Payment status is ${payInRequest.status}, expected COMPLETED`;
          console.error(`[Webhook Service] ${errorMsg}`);

          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.FAILED,
              responseBody: {
                error: errorMsg,
                currentStatus: payInRequest.status,
                expectedStatus: "COMPLETED",
              },
              processedAt: new Date(),
            },
          });
          return { success: false, error: errorMsg };
        }

        const existingRefund = await prisma.refund.findFirst({
          where: {
            payInRequestId: payInRequest.id,
            status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
          },
        });

        if (existingRefund) {
          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.FAILED,
              responseBody: {
                error: "Refund already exists. Chargeback blocked.",
              },
              processedAt: new Date(),
            },
          });
          throw new Error(
            "Refund exists — chargeback blocked to prevent double loss.",
          );
        }

        const chargebackAmount =
          processedData.amount || Number(payInRequest.amount);
        if (chargebackAmount > Number(payInRequest.amount)) {
          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.FAILED,
              responseBody: {
                error: `Chargeback amount ${chargebackAmount} exceeds original transaction amount ${payInRequest.amount}`,
              },
              processedAt: new Date(),
            },
          });
          throw new Error(
            `Chargeback amount ${chargebackAmount} exceeds original transaction amount ${payInRequest.amount}`,
          );
        }

        const chargeback =
          await chargebacksService.initiateChargebackFromWebhook({
            payInRequestId: payInRequest.id,
            amount: chargebackAmount,
            gatewayChargebackId: processedData.gatewayReference,
            reason: processedData.reason || "CUSTOMER_DISPUTE",
            status: ChargebackStatus.DISPUTED,
            metadata: processedData.metadata,
            notes: `Created via ${gatewayName} webhook. Requires manual admin approval.`,
          });

        await prisma.payInRequest.update({
          where: { id: payInRequest.id },
          data: {
            status: PayInRequestStatus.DISPUTED,
            failureReason: `Chargeback initiated: ${processedData.reason || "Customer dispute"}`,
            failureCode: "CHARGEBACK",
            metadata: {
              ...payInRequest.metadata,
              chargebackId: chargeback.id,
              chargebackStatus: "DISPUTED",
            },
          },
        });

        await prisma.chargebackLog.create({
          data: {
            chargebackId: chargeback.id,
            action: "CREATED",
            statusAfter: ChargebackStatus.DISPUTED,
            description: `Chargeback created via ${gatewayName} webhook. Reason: ${processedData.reason || "Customer dispute"}`,
          },
        });

        await prisma.inboundLog.update({
          where: { id: webhookLog.id },
          data: {
            gatewayId: payInRequest.gatewayId,
            merchantId: payInRequest.merchantId,
            status: WebhookStatus.SUCCESS,
            responseBody: {
              success: true,
              chargebackId: chargeback.id,
              message: "Chargeback created as DISPUTED. PayIn status updated.",
            },
            processedAt: new Date(),
          },
        });

        await auditLogService.logChargeback(
          null,
          payInRequest.merchantId,
          chargeback.id,
          chargeback.amount,
          "DISPUTED",
        );

        return;
      }

      await prisma.inboundLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookStatus.FAILED,
          responseBody: {
            error:
              "No merchantReference or gatewayReference provided for chargeback",
          },
          processedAt: new Date(),
        },
      });
      throw new Error("Missing reference for chargeback");
    } catch (error) {
      console.error(
        `Error handling chargeback webhook for ${gatewayName}:`,
        error,
      );
      await prisma.inboundLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookStatus.FAILED,
          responseBody: { error: error.message },
          processedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Handle refund webhook events
   */
  async handleRefundWebhook(processedData, gatewayName, webhookLog) {
    try {
      const refundsService = require("../refunds/refunds.service");

      if (processedData.refundId) {
        const mappedStatus =
          processedData.status === "COMPLETED"
            ? RefundStatus.COMPLETED
            : processedData.status === "FAILED"
              ? RefundStatus.FAILED
              : RefundStatus.PENDING;

        // Use the same method refunds.service.js uses, so logic stays in one place
        // (this handles status update + wallet debit atomically, with idempotency)
        const updated = await refundsService.updateStatusFromWebhook(
          processedData.refundId,
          mappedStatus,
          processedData.gatewayReference || processedData.metadata?.refundId,
        );

        await prisma.inboundLog.update({
          where: { id: webhookLog.id },
          data: {
            status: WebhookStatus.SUCCESS,
            responseBody: { success: true, refundId: updated.id },
            processedAt: new Date(),
          },
        });

        await auditLogService.logRefund(
          null,
          updated.merchantId,
          updated.id,
          updated.amount,
          updated.status,
        );

        return;
      }

      if (processedData.merchantReference || processedData.gatewayReference) {
        const payInRequest = await prisma.payInRequest.findFirst({
          where: {
            OR: [
              { merchantReference: processedData.merchantReference },
              { gatewayReference: processedData.gatewayReference },
            ],
          },
        });

        if (payInRequest) {
          const existingChargeback = await prisma.chargeback.findFirst({
            where: {
              payInRequestId: payInRequest.id,
              status: { in: ["PENDING", "DISPUTED", "APPROVED"] },
            },
          });

          if (existingChargeback) {
            await prisma.inboundLog.update({
              where: { id: webhookLog.id },
              data: {
                status: WebhookStatus.FAILED,
                responseBody: {
                  error: "Chargeback already exists. Refund blocked.",
                },
                processedAt: new Date(),
              },
            });
            throw new Error(
              "Chargeback exists — refund blocked to prevent double loss.",
            );
          }

          const refundAmount = processedData.amount
            ? Number(processedData.amount)
            : Number(payInRequest.amount);

          const refund = await refundsService.initiateRefundFromWebhook({
            payInRequestId: payInRequest.id,
            amount: refundAmount,
            gatewayRefundId: processedData.gatewayReference,
            reason: processedData.reason || "Customer refund",
            status:
              processedData.status === "COMPLETED"
                ? RefundStatus.COMPLETED
                : RefundStatus.PENDING,
            metadata: processedData.metadata || {},
            notes: `Created via ${gatewayName} webhook`,
          });

          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              gatewayId: payInRequest.gatewayId,
              merchantId: payInRequest.merchantId,
              status: WebhookStatus.SUCCESS,
              responseBody: { success: true, refundId: refund.id },
              processedAt: new Date(),
            },
          });

          await auditLogService.logRefund(
            null,
            payInRequest.merchantId,
            refund.id,
            refund.amount,
            refund.status,
          );

          return;
        } else {
          await prisma.inboundLog.update({
            where: { id: webhookLog.id },
            data: {
              status: WebhookStatus.FAILED,
              responseBody: {
                error: "No matching pay-in request found for refund",
              },
              processedAt: new Date(),
            },
          });
          return;
        }
      }

      await prisma.inboundLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookStatus.FAILED,
          responseBody: {
            error:
              "No merchantReference or gatewayReference provided for refund",
          },
          processedAt: new Date(),
        },
      });
      throw new Error("Missing reference for refund");
    } catch (error) {
      console.error(`Error handling refund webhook for ${gatewayName}:`, error);
      await prisma.inboundLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookStatus.FAILED,
          responseBody: { error: error.message },
          processedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Get webhook logs
   */
  async getLogs(filters) {
    const where = {};

    if (filters.gatewayId) where.gatewayId = parseInt(filters.gatewayId);
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.inboundLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: parseInt(filters.offset) || 0,
        take: parseInt(filters.limit) || 50,
        include: {
          gateway: { select: { id: true, name: true } },
          merchant: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.inboundLog.count({ where }),
    ]);

    return { logs, total };
  }
}

module.exports = new WebhookService();
