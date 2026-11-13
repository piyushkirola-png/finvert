const {
  RefundStatus,
  RefundType,
  TransactionType,
  WebhookEventType,
  PayInRequestStatus,
} = require("@prisma/client");
const prisma = require("../../../config/prisma");
const auditLogService = require("../../services/audit-log.service");

// IMPORT
const dummyRefundIntegration = require("./IntegrationServices/DummyIntegration/DummyIntegrationService.service");

class RefundService {
  /**
   * Get merchant's primary user
   */
  async getMerchantUser(merchantId, tx) {
    const user = await tx.user.findFirst({
      where: {
        merchantId: merchantId,
        role: "USER",
      },
      orderBy: { id: "asc" },
    });
    if (!user) {
      throw new Error(`No merchant user found for merchant: ${merchantId}`);
    }
    return user;
  }

  /**
   * Dispatch refund to the correct gateway integration
   */
  async callRefundGatewayIntegration(refund, payInRequest) {
    const gatewayId = payInRequest.gatewayId;

    switch (gatewayId) {
      case 19: // Dummy Gateway
        return await dummyRefundIntegration.createRefund({
          gatewayReference: payInRequest.gatewayReference,
          merchantReference: payInRequest.merchantReference,
          refundId: refund.id,
          amount: refund.amount,
          notes: refund.notes,
        });
      default:
        throw new Error(
          `No refund integration found for gateway ID: ${gatewayId}`,
        );
    }
  }

  /**
   * Initiate a new refund
   */
  async initiateRefund(data, currentUser) {
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get the pay-in request
    const payInRequest = await prisma.payInRequest.findUnique({
      where: { id: data.payInRequestId },
      include: {
        merchant: true,
        gateway: true,
      },
    });

    if (!payInRequest) {
      throw new Error("Pay-in request not found");
    }

    // Check if pay-in request is completed
    if (payInRequest.status !== PayInRequestStatus.COMPLETED) {
      throw new Error("Only completed pay-in requests can be refunded");
    }

    // Validate amount
    const refundAmount = data.amount || Number(payInRequest.amount);
    if (refundAmount <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }
    if (refundAmount > Number(payInRequest.amount)) {
      throw new Error(
        `Refund amount (${refundAmount}) cannot exceed original transaction amount (${payInRequest.amount})`,
      );
    }

    // Check total refunded amount so far (for partial refunds)
    const existingRefunds = await prisma.refund.findMany({
      where: { payInRequestId: payInRequest.id },
    });

    let totalRefundedSoFar = 0;
    existingRefunds.forEach((ref) => {
      totalRefundedSoFar += Number(ref.amount);
    });

    const remainingAmount = Number(payInRequest.amount) - totalRefundedSoFar;

    // Check if fully refunded already
    if (remainingAmount <= 0) {
      throw new Error("This pay-in request is already fully refunded");
    }

    // Check if requested refund amount exceeds remaining
    if (refundAmount > remainingAmount) {
      throw new Error(
        `Cannot refund ₹${refundAmount}. Only ₹${remainingAmount} remaining to refund`,
      );
    }

    // Check if chargeback already exists (exclusion rule - prevent double loss)
    const existingChargeback = await prisma.chargeback.findFirst({
      where: {
        payInRequestId: payInRequest.id,
        status: { in: ["PENDING", "DISPUTED", "APPROVED"] },
      },
    });

    if (existingChargeback) {
      throw new Error(
        "A chargeback already exists for this transaction. Refund cannot be initiated.",
      );
    }

    // Determine refund type
    const refundType =
      refundAmount === Number(payInRequest.amount)
        ? RefundType.FULL
        : RefundType.PARTIAL;

    // Create refund - PENDING, no wallet action
    const refund = await prisma.$transaction(async (tx) => {
      const newRefund = await tx.refund.create({
        data: {
          payInRequestId: payInRequest.id,
          merchantId: payInRequest.merchantId,
          gatewayId: payInRequest.gatewayId,
          amount: refundAmount,
          currency: payInRequest.currency || "INR",
          refundFee: 0,
          adjustmentAmount: 0,
          refundType: refundType,
          status: RefundStatus.PENDING,
          reason: data.reason || null,
          initiatedAt: new Date(),
          createdBy: currentUser.id.toString(),
          notes: data.notes || null,
          metadata: data.metadata || null,
        },
      });

      await tx.refundLog.create({
        data: {
          refundId: newRefund.id,
          action: "CREATED",
          statusAfter: RefundStatus.PENDING,
          description: `Refund initiated for pay-in request ${payInRequest.merchantReference}. Status: PENDING. Wallet NOT debited - requires gateway confirmation.`,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });

      return newRefund;
    });

    await auditLogService.logRefund(
      currentUser.id,
      refund.merchantId,
      refund.id,
      refund.amount,
      refund.status,
    );

    // Send notification
    await this.sendRefundNotification(refund, payInRequest);

    return refund;
  }

  /**
   * Get all refunds
   */
  async findAll(pagination, user, filterOptions = {}) {
    const where = {};

    if (user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      if (!user.merchantId) {
        throw new Error("No merchant associated with this user");
      }
      where.merchantId = user.merchantId;
    }

    if (filterOptions.status) {
      where.status = filterOptions.status;
    }

    if (filterOptions.merchantId) {
      where.merchantId = parseInt(filterOptions.merchantId);
    }

    if (filterOptions.payInRequestId) {
      where.payInRequestId = parseInt(filterOptions.payInRequestId);
    }

    if (filterOptions.merchantReference) {
      where.payInRequest = {
        merchantReference: {
          contains: filterOptions.merchantReference,
          mode: "insensitive",
        },
      };
    }

    if (filterOptions.refundType) {
      where.refundType = filterOptions.refundType;
    }

    if (filterOptions.startDate || filterOptions.endDate) {
      where.createdAt = {};
      if (filterOptions.startDate) {
        where.createdAt.gte = new Date(filterOptions.startDate);
      }
      if (filterOptions.endDate) {
        const endDateTime = new Date(filterOptions.endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    const orderBy = filterOptions.sorts || { createdAt: "desc" };

    const [total, refunds] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        orderBy,
        skip: pagination?.offset || 0,
        take: pagination?.limit || 10,
        include: {
          payInRequest: {
            select: {
              id: true,
              merchantReference: true,
              amount: true,
              status: true,
            },
          },
          merchant: {
            select: { id: true, name: true, email: true },
          },
          gateway: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return { refunds, total };
  }

  /**
   * Get single refund by ID
   */
  async findOne(id, user) {
    const refund = await prisma.refund.findUnique({
      where: { id: parseInt(id) },
      include: {
        payInRequest: {
          select: {
            id: true,
            merchantReference: true,
            amount: true,
            status: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
          },
        },
        merchant: {
          select: { id: true, name: true, email: true },
        },
        gateway: {
          select: { id: true, name: true },
        },
      },
    });

    const logs = await prisma.refundLog.findMany({
      where: { refundId: parseInt(id) },
      orderBy: { createdAt: "desc" },
    });
    refund.logs = logs;

    if (!refund) {
      throw new Error("Refund not found");
    }

    if (user && user.role === "USER") {
      if (!user.merchantId || refund.merchantId !== user.merchantId) {
        throw new Error("Access denied");
      }
    }

    return refund;
  }

  /**
   * Update refund status
   * Note: When admin clicks "Complete", this only sets status to PROCESSING
   * and calls Razorpay to initiate the refund. Actual COMPLETED status +
   * wallet debit happens later via webhook (refund.processed event), since
   * the actual bank transfer takes time (minutes to 5-7 business days).
   */
  async updateStatus(id, status, notes, currentUser) {
    const refund = await prisma.refund.findUnique({
      where: { id: parseInt(id) },
      include: {
        payInRequest: true,
      },
    });

    if (!refund) {
      throw new Error("Refund not found");
    }

    const validTransitions = {
      PENDING: ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
      PROCESSING: ["COMPLETED", "FAILED"],
      FAILED: ["PENDING"],
      COMPLETED: [],
      CANCELLED: [],
    };

    // Admin clicking "Complete" in UI actually triggers PROCESSING internally
    // (gateway call happens, but we wait for webhook to confirm true completion)
    const targetStatus =
      status === RefundStatus.COMPLETED ? RefundStatus.PROCESSING : status;

    if (!validTransitions[refund.status]?.includes(targetStatus)) {
      throw new Error(
        `Invalid status transition from ${refund.status} to ${targetStatus}`,
      );
    }

    const oldStatus = refund.status;

    // ===== CALL GATEWAY BEFORE TOUCHING DB (outside transaction) =====
    // Only fires when admin is completing (targetStatus === PROCESSING here)
    let gatewayResult = null;
    if (targetStatus === RefundStatus.PROCESSING) {
      try {
        gatewayResult = await this.callRefundGatewayIntegration(
          refund,
          refund.payInRequest,
        );
      } catch (gatewayError) {
        console.error(
          `[Refund] Gateway call failed for refund ${refund.id}:`,
          gatewayError.message,
        );
        throw new Error(`Gateway refund failed: ${gatewayError.message}`);
      }
    }

    return await prisma.$transaction(
      async (tx) => {
        const updated = await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: targetStatus,
            updatedBy: currentUser.id.toString(),
            notes: notes || refund.notes,
            processedAt:
              targetStatus === RefundStatus.PROCESSING
                ? new Date()
                : refund.processedAt,
            completedAt:
              targetStatus === RefundStatus.COMPLETED ? new Date() : null,
            failedAt: targetStatus === RefundStatus.FAILED ? new Date() : null,
            gatewayRefundId:
              gatewayResult?.gatewayRefundId || refund.gatewayRefundId,
          },
        });

        await tx.refundLog.create({
          data: {
            refundId: refund.id,
            action: "STATUS_UPDATED",
            statusBefore: oldStatus,
            statusAfter: targetStatus,
            description:
              targetStatus === RefundStatus.PROCESSING
                ? `Refund initiated with gateway. Status: PROCESSING. Waiting for bank confirmation via webhook.${gatewayResult ? ` Gateway refund ID: ${gatewayResult.gatewayRefundId}` : ""}`
                : `Status updated from ${oldStatus} to ${targetStatus}${notes ? ": " + notes : ""}`,
          },
        });

        // Wallet debit ONLY happens when status is truly COMPLETED
        // (i.e. via webhook confirmation, not here on PROCESSING)
        if (targetStatus === RefundStatus.COMPLETED) {
          await this.processRefundWalletDebit(refund.id, tx);
        }

        if (targetStatus === RefundStatus.COMPLETED) {
          await this.sendRefundCompletedNotification(
            updated,
            refund.payInRequest,
          );
        }

        await auditLogService.logRefund(
          currentUser.id,
          refund.merchantId,
          refund.id,
          refund.amount,
          targetStatus,
        );

        return updated;
      },
      { isolationLevel: "Serializable" },
    );
  }

  /**
   * Update refund status FROM WEBHOOK (internal use only - bypasses admin
   * PROCESSING gate since gateway itself is confirming the final outcome).
   * Called by webhook.service.js's handleRefundWebhook() when
   * refund.processed / refund.failed events arrive.
   */
  async updateStatusFromWebhook(id, status, gatewayRefundId) {
    const refund = await prisma.refund.findUnique({
      where: { id: parseInt(id) },
      include: { payInRequest: true },
    });

    if (!refund) {
      throw new Error("Refund not found");
    }

    if (refund.status === RefundStatus.COMPLETED) {
      console.log(`[Refund] ${refund.id} already COMPLETED, skipping`);
      return refund;
    }

    const oldStatus = refund.status;

    return await prisma.$transaction(
      async (tx) => {
        const updated = await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: status,
            completedAt: status === RefundStatus.COMPLETED ? new Date() : null,
            failedAt: status === RefundStatus.FAILED ? new Date() : null,
            gatewayRefundId: gatewayRefundId || refund.gatewayRefundId,
          },
        });

        await tx.refundLog.create({
          data: {
            refundId: refund.id,
            action: "WEBHOOK_CONFIRMED",
            statusBefore: oldStatus,
            statusAfter: status,
            description: `Bank confirmed refund ${status.toLowerCase()} via gateway webhook.`,
          },
        });

        if (status === RefundStatus.COMPLETED) {
          await this.processRefundWalletDebit(refund.id, tx);
          await this.sendRefundCompletedNotification(
            updated,
            refund.payInRequest,
          );
        }

        return updated;
      },
      { isolationLevel: "Serializable" },
    );
  }

  /**
   * Process refund wallet debit - PayIn wallet only
   */
  async processRefundWalletDebit(refundId, tx) {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: {
        payInRequest: true,
      },
    });

    if (!refund) {
      throw new Error("Refund not found");
    }

    if (refund.walletDebitTransactionId) {
      throw new Error("Wallet already debited for this refund");
    }

    const merchantUser = await this.getMerchantUser(refund.merchantId, tx);

    const lockedResult = await tx.$queryRaw`
          SELECT * FROM "PayInWallet" 
          WHERE "merchantId" = ${refund.merchantId}
          AND "userId" = ${merchantUser.id}
          ORDER BY id DESC 
          LIMIT 1 
          FOR UPDATE
        `;
    const lastWallet = lockedResult[0];

    const openingBalance = Number(lastWallet?.closingBalance || 0);
    const refundTotal = Number(refund.amount) + Number(refund.refundFee || 0);

    if (openingBalance < refundTotal) {
      throw new Error(
        `Insufficient wallet balance. Available: ₹${openingBalance}, Required: ₹${refundTotal}`,
      );
    }

    const closingBalance = openingBalance - refundTotal;

    const walletTransaction = await tx.payInWallet.create({
      data: {
        merchantId: refund.merchantId,
        userId: merchantUser.id,
        amount: refundTotal,
        type: TransactionType.DEBIT,
        description: `Refund completed - ${refund.payInRequest.merchantReference}`,
        transactionId: `RF-${refund.id}`,
        referenceId: String(refund.payInRequestId),
        transactionDate: new Date(),
        openingBalance: openingBalance,
        closingBalance: closingBalance,
      },
    });

    await tx.refund.update({
      where: { id: refundId },
      data: {
        walletDebitTransactionId: walletTransaction.id,
      },
    });

    await this.updateWalletSummary(refund.merchantId, merchantUser.id, tx);
    return walletTransaction;
  }

  /**
   * Update wallet summary (PayIn wallet)
   */
  async updateWalletSummary(merchantId, userId, tx) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const totalCredit = await tx.payInWallet.aggregate({
      where: { merchantId, userId, type: "CREDIT" },
      _sum: { amount: true },
    });
    const totalDebit = await tx.payInWallet.aggregate({
      where: { merchantId, userId, type: "DEBIT" },
      _sum: { amount: true },
    });
    const currentBalance =
      Number(totalCredit._sum.amount || 0) -
      Number(totalDebit._sum.amount || 0);

    const todayDebits = await tx.payInWallet.aggregate({
      where: {
        merchantId,
        userId,
        type: "DEBIT",
        transactionDate: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    const todayCredits = await tx.payInWallet.aggregate({
      where: {
        merchantId,
        userId,
        type: "CREDIT",
        transactionDate: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    await tx.payInWalletSummary.upsert({
      where: {
        merchantId_userId: { merchantId, userId },
      },
      update: {
        closingBalance: currentBalance,
        totalInToday: Number(todayCredits._sum.amount || 0),
        netChargesToday: Number(todayDebits._sum.amount || 0),
        updatedAt: new Date(),
      },
      create: {
        merchantId,
        userId,
        closingBalance: currentBalance,
        totalInToday: Number(todayCredits._sum.amount || 0),
        totalInThisWeek: 0,
        totalInThisMonth: 0,
        totalInThisYear: 0,
        successfulPayIns: 0,
        failedPayIns: 0,
        pendingPayIns: 0,
        totalPayIns: 0,
        netChargesToday: Number(todayDebits._sum.amount || 0),
        netChargesThisWeek: 0,
        netChargesThisMonth: 0,
        netChargesThisYear: 0,
        lastTransactionProcessed: new Date().toISOString(),
      },
    });
  }

  /**
   * Cancel refund (Admin only)
   */
  async cancelRefund(id, reason, notes, currentUser) {
    const refund = await prisma.refund.findUnique({
      where: { id: parseInt(id) },
    });

    if (!refund) {
      throw new Error("Refund not found");
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new Error(
        `Only PENDING refunds can be cancelled. Current status: ${refund.status}`,
      );
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.CANCELLED,
          cancelledAt: new Date(),
          updatedBy: currentUser.id.toString(),
          notes: notes || refund.notes,
          failureReason: reason || "Cancelled by admin",
        },
      });

      await tx.refundLog.create({
        data: {
          refundId: refund.id,
          action: "CANCELLED",
          statusBefore: refund.status,
          statusAfter: RefundStatus.CANCELLED,
          description: `Refund cancelled${reason ? ": " + reason : ""}. No wallet change (nothing was debited).`,
        },
      });

      return updated;
    });
  }

  /**
   * Initiate a refund from webhook
   */
  async initiateRefundFromWebhook(webhookData) {
    if (!webhookData.payInRequestId) {
      throw new Error("payInRequestId is required");
    }

    const payInRequest = await prisma.payInRequest.findUnique({
      where: { id: webhookData.payInRequestId },
    });

    if (!payInRequest) {
      throw new Error("Pay-in request not found");
    }

    if (payInRequest.status !== PayInRequestStatus.COMPLETED) {
      throw new Error("Only completed pay-in requests can be refunded");
    }

    // Validate amount
    const refundAmount = webhookData.amount || Number(payInRequest.amount);
    if (refundAmount <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }
    if (refundAmount > Number(payInRequest.amount)) {
      throw new Error(
        `Refund amount (${refundAmount}) cannot exceed original transaction amount (${payInRequest.amount})`,
      );
    }

    // Check total refunded amount so far (for partial refunds)
    const existingRefunds = await prisma.refund.findMany({
      where: { payInRequestId: payInRequest.id },
    });

    let totalRefundedSoFar = 0;
    existingRefunds.forEach((ref) => {
      totalRefundedSoFar += Number(ref.amount);
    });

    const remainingAmount = Number(payInRequest.amount) - totalRefundedSoFar;

    // Check if fully refunded already
    if (remainingAmount <= 0) {
      throw new Error("This pay-in request is already fully refunded");
    }

    // Check if requested refund amount exceeds remaining
    if (refundAmount > remainingAmount) {
      throw new Error(
        `Cannot refund ₹${refundAmount}. Only ₹${remainingAmount} remaining to refund`,
      );
    }

    // Check if chargeback already exists
    const existingChargeback = await prisma.chargeback.findFirst({
      where: {
        payInRequestId: payInRequest.id,
        status: { in: ["PENDING", "DISPUTED", "APPROVED"] },
      },
    });

    if (existingChargeback) {
      throw new Error(
        "A chargeback already exists for this transaction. Refund cannot be initiated.",
      );
    }

    const refundType =
      refundAmount === Number(payInRequest.amount)
        ? RefundType.FULL
        : RefundType.PARTIAL;

    const status = webhookData.status || RefundStatus.PENDING;

    const refund = await prisma.$transaction(async (tx) => {
      const newRefund = await tx.refund.create({
        data: {
          payInRequestId: payInRequest.id,
          merchantId: payInRequest.merchantId,
          gatewayId: payInRequest.gatewayId,
          amount: refundAmount,
          currency: webhookData.currency || "INR",
          refundFee: webhookData.refundFee || 0,
          adjustmentAmount: webhookData.adjustmentAmount || 0,
          refundType: refundType,
          status: status,
          reason: webhookData.reason || "Customer refund",
          gatewayRefundId: webhookData.gatewayRefundId || null,
          initiatedAt: webhookData.initiatedAt || new Date(),
          completedAt: status === RefundStatus.COMPLETED ? new Date() : null,
          notes: webhookData.notes || "Created via webhook from gateway",
          metadata: webhookData.metadata || null,
        },
      });

      await tx.refundLog.create({
        data: {
          refundId: newRefund.id,
          action: status === RefundStatus.COMPLETED ? "COMPLETED" : "CREATED",
          statusAfter: status,
          description: `Refund ${status === RefundStatus.COMPLETED ? "completed" : "created"} via webhook from gateway${webhookData.gatewayRefundId ? " (ID: " + webhookData.gatewayRefundId + ")" : ""}`,
        },
      });

      return newRefund;
    });

    // If gateway confirmed completed right away, process wallet debit
    if (refund.status === RefundStatus.COMPLETED) {
      await prisma.$transaction(async (tx) => {
        await this.processRefundWalletDebit(refund.id, tx);
      });
    }

    await this.sendRefundNotification(refund, payInRequest);

    return refund;
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification(refund, payInRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: refund.merchantId },
      });

      if (!merchant?.webhookUrl) {
        return;
      }

      const webhookData = {
        event: "REFUND_CREATED",
        data: {
          id: refund.id,
          payInRequestId: refund.payInRequestId,
          merchantReference: payInRequest.merchantReference,
          amount: Number(refund.amount),
          refundType: refund.refundType,
          status: refund.status,
          createdAt: refund.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          eventType: WebhookEventType.REFUND_CREATED,
          requestBody: webhookData,
          status: "PENDING",
          amount: refund.amount,
        },
      });

      const axios = require("axios");
      axios
        .post(merchant.webhookUrl, webhookData, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        })
        .catch((error) => {
          console.error("Failed to send refund webhook:", error.message);
        });
    } catch (error) {
      console.error("Error sending refund notification:", error);
    }
  }

  /**
   * Send refund completed notification
   */
  async sendRefundCompletedNotification(refund, payInRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: refund.merchantId },
      });

      if (!merchant?.webhookUrl) {
        return;
      }

      const webhookData = {
        event: "REFUND_COMPLETED",
        data: {
          id: refund.id,
          payInRequestId: refund.payInRequestId,
          merchantReference: payInRequest.merchantReference,
          amount: Number(refund.amount),
          refundType: refund.refundType,
          status: refund.status,
          completedAt: refund.completedAt,
        },
        timestamp: new Date().toISOString(),
      };

      await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          eventType: WebhookEventType.REFUND_COMPLETED,
          requestBody: webhookData,
          status: "PENDING",
          amount: refund.amount,
        },
      });

      const axios = require("axios");
      axios
        .post(merchant.webhookUrl, webhookData, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        })
        .catch((error) => {
          console.error(
            "Failed to send refund completed webhook:",
            error.message,
          );
        });
    } catch (error) {
      console.error("Error sending refund completed notification:", error);
    }
  }
}

module.exports = new RefundService();
