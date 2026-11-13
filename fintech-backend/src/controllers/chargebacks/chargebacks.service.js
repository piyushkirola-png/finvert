const {
  ChargebackStatus,
  ChargebackReason,
  TransactionType,
  WebhookEventType,
  PayInRequestStatus,
} = require("@prisma/client");
const prisma = require("../../../config/prisma");
const axios = require("axios");
const auditLogService = require("../../services/audit-log.service");

const dummyChargebackIntegration = require("./IntegrationServices/DummyIntegration/DummyIntegrationService.service");

const VALID_CHARGEBACK_REASONS = new Set([
  "FRAUDULENT",
  "DUPLICATE",
  "PRODUCT_NOT_RECEIVED",
  "SERVICE_NOT_PROVIDED",
  "UNAUTHORIZED",
  "TECHNICAL_ISSUE",
  "CUSTOMER_DISPUTE",
  "CANCELLED",
  "OTHER",
]);

function normalizeChargebackReason(raw) {
  if (!raw) return "CUSTOMER_DISPUTE";
  const upper = String(raw)
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return VALID_CHARGEBACK_REASONS.has(upper) ? upper : "CUSTOMER_DISPUTE";
}

class ChargebackService {
  /**
   * Initiate a new chargeback
   */
  async initiateChargeback(data, currentUser) {
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
      throw new Error("Only completed pay-in requests can be charged back");
    }

    // Check for existing chargeback
    const existingChargeback = await prisma.chargeback.findFirst({
      where: { payInRequestId: payInRequest.id },
    });

    if (existingChargeback) {
      throw new Error("A chargeback already exists for this pay-in request");
    }

    // Check merchant permission
    if (currentUser.role === "USER") {
      if (
        !currentUser.merchantId ||
        payInRequest.merchantId !== currentUser.merchantId
      ) {
        throw new Error(
          "You don't have permission to chargeback this transaction",
        );
      }
    }

    // CHECK: Check if refund already exists
    const existingRefund = await prisma.refund.findFirst({
      where: {
        payInRequestId: payInRequest.id,
        status: { in: ["PENDING", "COMPLETED"] },
      },
    });
    if (existingRefund) {
      throw new Error(
        "A refund already exists for this transaction. Cannot create chargeback.",
      );
    }

    // Check chargeback time window (120 days)
    const chargebackWindowDays = 120;
    if (payInRequest.completedAt) {
      const daysSinceTransaction =
        (Date.now() - new Date(payInRequest.completedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceTransaction > chargebackWindowDays) {
        throw new Error(
          `Chargeback window has expired. Transactions older than ${chargebackWindowDays} days cannot be charged back.`,
        );
      }
    }

    // Check for duplicate gateway chargeback ID
    if (data.gatewayChargebackId) {
      const existingGatewayChargeback = await prisma.chargeback.findFirst({
        where: { gatewayChargebackId: data.gatewayChargebackId },
      });
      if (existingGatewayChargeback) {
        throw new Error(
          `Chargeback with gateway ID ${data.gatewayChargebackId} already exists`,
        );
      }
    }

    // Validate amount does NOT exceed original request amount
    const chargebackAmount = data.amount || payInRequest.amount;
    if (Number(chargebackAmount) > Number(payInRequest.amount)) {
      throw new Error(
        `Chargeback amount (${chargebackAmount}) cannot exceed original transaction amount (${payInRequest.amount})`,
      );
    }

    const chargeback = await prisma.$transaction(async (tx) => {
      const newChargeback = await tx.chargeback.create({
        data: {
          payInRequestId: payInRequest.id,
          merchantId: payInRequest.merchantId,
          gatewayId: payInRequest.gatewayId,
          amount: chargebackAmount,
          currency: payInRequest.currency || "INR",
          chargebackFee: 500,
          merchantLiability: chargebackAmount,
          status: ChargebackStatus.PENDING,
          reason: data.reason || "CUSTOMER_DISPUTE",
          reasonDescription: data.reasonDescription || null,
          customerName: data.customerName || payInRequest.customerName,
          customerEmail: data.customerEmail || payInRequest.customerEmail,
          customerPhone: data.customerPhone || payInRequest.customerPhone,
          initiatedAt: new Date(),
          createdBy: currentUser.id.toString(),
          notes: data.notes || null,
          metadata: data.metadata || null,
        },
      });

      // Set payin status to DISPUTED instead of FAILED
      await tx.payInRequest.update({
        where: { id: payInRequest.id },
        data: {
          status: PayInRequestStatus.DISPUTED,
          failureReason: `Chargeback disputed: ${data.reason || "Customer dispute"}. Awaiting admin review.`,
          failureCode: "CHARGEBACK_DISPUTED",
        },
      });

      await tx.chargebackLog.create({
        data: {
          chargebackId: newChargeback.id,
          action: "CREATED",
          statusAfter: ChargebackStatus.PENDING,
          description: `Chargeback initiated for pay-in request ${payInRequest.merchantReference}. Status: PENDING. Wallet NOT debited - requires admin approval.`,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });

      return newChargeback;
    });

    await auditLogService.logChargeback(
      currentUser.id,
      chargeback.merchantId,
      chargeback.id,
      chargeback.amount,
      chargeback.status,
    );

    // Send notifications
    await this.sendChargebackNotification(chargeback, payInRequest);
    await this.sendEmailNotification(chargeback, payInRequest);

    return chargeback;
  }

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
   * Dispatch chargeback action to the correct gateway integration
   */
  async callChargebackGatewayIntegration(action, chargeback, evidenceData) {
    const gatewayId = chargeback.gatewayId;

    switch (gatewayId) {
      case 19: // Dummy Gateway
        if (action === "accept") {
          return await dummyChargebackIntegration.acceptDispute(
            chargeback.gatewayChargebackId,
          );
        } else if (action === "contest") {
          return await dummyChargebackIntegration.contestDispute(
            chargeback.gatewayChargebackId,
            evidenceData,
          );
        }
        throw new Error(`Unknown chargeback action: ${action}`);
      default:
        throw new Error(`Unknown chargeback action: ${action}`);
    }
  }

  /**
   * Get all chargebacks with filters
   */
  async findAll(pagination, user, filterOptions = {}) {
    const where = {};

    // Role-based access
    if (user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      if (!user.merchantId) {
        throw new Error("No merchant associated with this user");
      }
      where.merchantId = user.merchantId;
    }

    // Apply filters
    if (filterOptions.status) {
      where.status = filterOptions.status;
    }

    if (filterOptions.merchantId) {
      where.merchantId = parseInt(filterOptions.merchantId);
    }

    if (filterOptions.payInRequestId) {
      where.payInRequestId = parseInt(filterOptions.payInRequestId);
    }

    // Amount range filters
    if (filterOptions.amountMin) {
      where.amount = { gte: parseFloat(filterOptions.amountMin) };
    }
    if (filterOptions.amountMax) {
      where.amount = {
        ...where.amount,
        lte: parseFloat(filterOptions.amountMax),
      };
    }

    // Date range
    if (filterOptions.startDate || filterOptions.endDate) {
      where.initiatedAt = {};
      if (filterOptions.startDate) {
        where.initiatedAt.gte = new Date(filterOptions.startDate);
      }
      if (filterOptions.endDate) {
        const endDateTime = new Date(filterOptions.endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.initiatedAt.lte = endDateTime;
      }
    }

    // Search
    if (filterOptions.search) {
      where.OR = [
        {
          merchant: {
            name: { contains: filterOptions.search, mode: "insensitive" },
          },
        },
        {
          payInRequest: {
            merchantReference: {
              contains: filterOptions.search,
              mode: "insensitive",
            },
          },
        },
        {
          reasonDescription: {
            contains: filterOptions.search,
            mode: "insensitive",
          },
        },
      ];
    }

    const orderBy = filterOptions.sorts || { createdAt: "desc" };

    const [total, chargebacks] = await Promise.all([
      prisma.chargeback.count({ where }),
      prisma.chargeback.findMany({
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

    return { chargebacks, total };
  }

  /**
   * Get single chargeback by ID
   */
  async findOne(id, user) {
    const chargebackId = parseInt(id);
    if (isNaN(chargebackId) || chargebackId < 1) {
      throw new Error("Invalid chargeback ID");
    }

    const chargeback = await prisma.chargeback.findUnique({
      where: { id: chargebackId },
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

    const logs = await prisma.chargebackLog.findMany({
      where: { chargebackId: chargebackId },
      orderBy: { createdAt: "desc" },
    });
    chargeback.logs = logs;

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    if (user && user.role === "USER") {
      if (!user.merchantId || chargeback.merchantId !== user.merchantId) {
        throw new Error("Access denied");
      }
    }

    return chargeback;
  }

  /**
   * Update chargeback status (Admin only)
   * @param {object} extraData - optional { evidenceData } used when status === REJECTED (contest)
   */
  async updateStatus(id, status, notes, currentUser, extraData = {}) {
    const chargebackId = parseInt(id);
    if (isNaN(chargebackId) || chargebackId < 1) {
      throw new Error("Invalid chargeback ID");
    }

    const validTransitions = {
      DISPUTED: ["APPROVED", "REJECTED"],
      APPROVED: ["REVERSED"],
      REJECTED: ["REVERSED"],
      REVERSED: [],
    };

    const chargeback = await prisma.chargeback.findUnique({
      where: { id: chargebackId },
      include: {
        payInRequest: true,
      },
    });

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    if (!validTransitions[chargeback.status]?.includes(status)) {
      throw new Error(
        `Invalid status transition from ${chargeback.status} to ${status}`,
      );
    }

    const oldStatus = chargeback.status;

    // ===== CALL GATEWAY BEFORE TOUCHING DB (outside transaction) =====
    // APPROVED = admin accepts the dispute (merchant concedes) -> tell Razorpay to accept
    // REJECTED = admin contests the dispute (merchant disagrees) -> tell Razorpay to contest
    let gatewayResult = null;
    if (status === ChargebackStatus.APPROVED) {
      try {
        gatewayResult = await this.callChargebackGatewayIntegration(
          "accept",
          chargeback,
        );
      } catch (gatewayError) {
        console.error(
          `[Chargeback] Gateway accept failed for chargeback ${chargeback.id}:`,
          gatewayError.message,
        );
        throw new Error(
          `Gateway accept dispute failed: ${gatewayError.message}`,
        );
      }
    } else if (status === ChargebackStatus.REJECTED) {
      try {
        gatewayResult = await this.callChargebackGatewayIntegration(
          "contest",
          chargeback,
          extraData.evidenceData,
        );
      } catch (gatewayError) {
        console.error(
          `[Chargeback] Gateway contest failed for chargeback ${chargeback.id}:`,
          gatewayError.message,
        );
        throw new Error(
          `Gateway contest dispute failed: ${gatewayError.message}`,
        );
      }
    }

    return await prisma.$transaction(
      async (tx) => {
        const updated = await tx.chargeback.update({
          where: { id: chargebackId },
          data: {
            status: status,
            updatedBy: currentUser.id.toString(),
            notes: notes || chargeback.notes,
            respondedAt:
              status !== ChargebackStatus.PENDING ? new Date() : null,
            resolvedAt:
              status === ChargebackStatus.RESOLVED ||
              status === ChargebackStatus.REVERSED ||
              status === ChargebackStatus.APPROVED
                ? new Date()
                : null,
          },
        });

        await tx.chargebackLog.create({
          data: {
            chargebackId: chargeback.id,
            action: "STATUS_UPDATED",
            statusBefore: oldStatus,
            statusAfter: status,
            description: `Status updated from ${oldStatus} to ${status}${notes ? ": " + notes : ""}${gatewayResult ? ` | Gateway response: ${gatewayResult.status}` : ""}`,
            ipAddress: currentUser.ipAddress || null,
            userAgent: currentUser.userAgent || null,
          },
        });

        // process wallet debit when admin manually APPROVES
        if (status === ChargebackStatus.APPROVED) {
          await this.processChargebackWalletDebit(chargeback.id, tx);
        }

        // process wallet credit when admin manually REVERSES
        if (status === ChargebackStatus.REVERSED) {
          await this.reverseChargebackWalletDebit(chargeback.id, tx);
        }

        // Send notification on status change
        await this.sendStatusChangeNotification(
          updated,
          chargeback,
          currentUser,
        );

        await auditLogService.logChargeback(
          currentUser.id,
          chargeback.merchantId,
          chargeback.id,
          chargeback.amount,
          status,
        );

        return updated;
      },
      { isolationLevel: "Serializable" },
    );
  }

  /**
   * Process chargeback wallet debit with balance check
   */
  async processChargebackWalletDebit(chargebackId, tx) {
    const chargeback = await tx.chargeback.findUnique({
      where: { id: chargebackId },
      include: {
        payInRequest: true,
      },
    });

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    if (chargeback.walletDebitTransactionId) {
      throw new Error("Wallet already debited for this chargeback");
    }

    const merchantUser = await this.getMerchantUser(chargeback.merchantId, tx);

    const lockedResult = await tx.$queryRaw`
          SELECT * FROM "PayInWallet"
          WHERE "merchantId" = ${chargeback.merchantId}
          AND "userId" = ${merchantUser.id}
          ORDER BY id DESC 
          LIMIT 1 
          FOR UPDATE
        `;
    const lastWallet = lockedResult[0];

    const openingBalance = Number(lastWallet?.closingBalance || 0);

    const chargebackTotal =
      Number(chargeback.amount) + Number(chargeback.chargebackFee || 0);

    const closingBalance = openingBalance - chargebackTotal;

    const walletTransaction = await tx.payInWallet.create({
      data: {
        merchantId: chargeback.merchantId,
        userId: merchantUser.id,
        amount: chargebackTotal,
        type: TransactionType.DEBIT,
        description: `Chargeback approved - ${chargeback.payInRequest.merchantReference} (Amount: ₹${chargeback.amount} + Fee: ₹${chargeback.chargebackFee || 0})`,
        transactionId: `CB-${chargeback.id}`,
        referenceId: String(chargeback.payInRequestId),
        transactionDate: new Date(),
        openingBalance: openingBalance,
        closingBalance: closingBalance,
      },
    });

    await tx.chargeback.update({
      where: { id: chargebackId },
      data: {
        walletDebitTransactionId: walletTransaction.id,
      },
    });

    await this.updateWalletSummary(chargeback.merchantId, merchantUser.id, tx);
    return walletTransaction;
  }

  /**
   * Reverse chargeback wallet debit
   */
  async reverseChargebackWalletDebit(chargebackId, tx) {
    const chargeback = await tx.chargeback.findUnique({
      where: { id: chargebackId },
      include: {
        payInRequest: true,
      },
    });

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    // Prevent double credit
    if (chargeback.walletCreditTransactionId) {
      throw new Error("Wallet already credited for this chargeback reversal");
    }

    if (!chargeback.walletDebitTransactionId) {
      if (chargeback.payInRequest) {
        await tx.payInRequest.update({
          where: { id: chargeback.payInRequestId },
          data: {
            status: PayInRequestStatus.COMPLETED,
            failureReason: null,
            failureCode: null,
          },
        });
      }
      return null;
    }

    const merchantUser = await this.getMerchantUser(chargeback.merchantId, tx);

    const lockedResult = await tx.$queryRaw`
          SELECT * FROM "PayInWallet"
          WHERE "merchantId" = ${chargeback.merchantId}
          AND "userId" = ${merchantUser.id}
          ORDER BY id DESC 
          LIMIT 1 
          FOR UPDATE
        `;
    const lastWallet = lockedResult[0];

    const openingBalance = Number(lastWallet?.closingBalance || 0);
    const creditAmount =
      Number(chargeback.amount) + Number(chargeback.chargebackFee || 0);
    const closingBalance = openingBalance + creditAmount;

    const walletTransaction = await tx.payInWallet.create({
      data: {
        merchantId: chargeback.merchantId,
        userId: merchantUser.id,
        amount: creditAmount,
        type: TransactionType.CREDIT,
        description: `Chargeback reversed - ${chargeback.payInRequest.merchantReference} (Amount: ₹${chargeback.amount} + Fee: ₹${chargeback.chargebackFee || 0})`,
        transactionId: `CB-REV-${chargeback.id}`,
        transactionDate: new Date(),
        openingBalance: openingBalance,
        closingBalance: closingBalance,
      },
    });

    await tx.chargeback.update({
      where: { id: chargebackId },
      data: {
        walletCreditTransactionId: walletTransaction.id,
        recoveredAmount: creditAmount,
      },
    });

    // Restore payin request status to COMPLETED on reversal
    if (chargeback.payInRequest) {
      await tx.payInRequest.update({
        where: { id: chargeback.payInRequestId },
        data: {
          status: PayInRequestStatus.COMPLETED,
          failureReason: null,
          failureCode: null,
        },
      });
    }

    await this.updateWalletSummary(chargeback.merchantId, merchantUser.id, tx);
    return walletTransaction;
  }

  /**
   * Update wallet summary
   */
  async updateWalletSummary(merchantId, userId, tx) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Get merchant user
    const merchantUser = await tx.user.findFirst({
      where: {
        merchantId: merchantId,
        role: "USER",
      },
      orderBy: { id: "asc" },
    });

    if (!merchantUser) {
      throw new Error(`No merchant user found for merchant: ${merchantId}`);
    }

    const systemUserId = userId;

    // Get latest wallet for this specific merchant+user
    const totalCredit = await tx.payInWallet.aggregate({
      where: { merchantId: merchantId, userId: systemUserId, type: "CREDIT" },
      _sum: { amount: true },
    });
    const totalDebit = await tx.payInWallet.aggregate({
      where: { merchantId: merchantId, userId: systemUserId, type: "DEBIT" },
      _sum: { amount: true },
    });
    const currentBalance =
      Number(totalCredit._sum.amount || 0) -
      Number(totalDebit._sum.amount || 0);

    // Get today's debits for this merchant+user
    const todayDebits = await tx.payInWallet.aggregate({
      where: {
        merchantId: merchantId,
        userId: systemUserId,
        type: "DEBIT",
        transactionDate: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    const totalDebitsToday = Number(todayDebits._sum.amount || 0);

    // Get today's credits for this merchant+user
    const todayCredits = await tx.payInWallet.aggregate({
      where: {
        merchantId: merchantId,
        userId: systemUserId,
        type: "CREDIT",
        transactionDate: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    const totalCreditsToday = Number(todayCredits._sum.amount || 0);

    // Get today's payin counts
    const [completedToday, failedToday, pendingToday] = await Promise.all([
      tx.payInRequest.count({
        where: {
          merchantId: merchantId,
          userId: systemUserId,
          status: {
            in: ["COMPLETED", "DISPUTED"],
          },
          completedAt: { gte: startOfDay },
        },
      }),
      tx.payInRequest.count({
        where: {
          merchantId: merchantId,
          userId: systemUserId,
          status: "FAILED",
          completedAt: { gte: startOfDay },
        },
      }),
      tx.payInRequest.count({
        where: {
          merchantId: merchantId,
          userId: systemUserId,
          status: "PENDING",
          requestedAt: { gte: startOfDay },
        },
      }),
    ]);

    await tx.payInWalletSummary.upsert({
      where: {
        merchantId_userId: {
          merchantId: merchantId,
          userId: systemUserId,
        },
      },
      update: {
        closingBalance: currentBalance,
        totalInToday: totalCreditsToday,
        netChargesToday: totalDebitsToday,
        successfulPayIns: completedToday,
        failedPayIns: failedToday,
        pendingPayIns: pendingToday,
        totalPayIns: completedToday + failedToday + pendingToday,
        updatedAt: new Date(),
      },
      create: {
        merchantId: merchantId,
        userId: systemUserId,
        closingBalance: currentBalance,
        totalInToday: totalCreditsToday,
        totalInThisWeek: 0,
        totalInThisMonth: 0,
        totalInThisYear: 0,
        successfulPayIns: completedToday,
        failedPayIns: failedToday,
        pendingPayIns: pendingToday,
        totalPayIns: completedToday + failedToday + pendingToday,
        netChargesToday: totalDebitsToday,
        netChargesThisWeek: 0,
        netChargesThisMonth: 0,
        netChargesThisYear: 0,
        lastTransactionProcessed: new Date().toISOString(),
      },
    });
  }

  /**
   * Send chargeback notification via webhook
   */
  async sendChargebackNotification(chargeback, payInRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: chargeback.merchantId },
      });

      if (!merchant?.webhookUrl) {
        return;
      }

      const webhookData = {
        event: "CHARGEBACK_CREATED",
        data: {
          id: chargeback.id,
          payInRequestId: chargeback.payInRequestId,
          merchantReference: payInRequest.merchantReference,
          amount: Number(chargeback.amount),
          status: chargeback.status,
          reason: chargeback.reason,
          createdAt: chargeback.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      await prisma.outboundLog.create({
        data: {
          merchantId: merchant.id,
          eventType: WebhookEventType.CHARGEBACK_CREATED,
          requestBody: webhookData,
          status: "PENDING",
          amount: chargeback.amount,
        },
      });

      await this.sendWebhookWithRetry(merchant.webhookUrl, webhookData, 3);
    } catch (error) {
      console.error("Error sending chargeback notification:", error);
    }
  }

  /**
   * Send webhook with retry mechanism
   */
  async sendWebhookWithRetry(url, data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, data, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(
            `Webhook failed after ${maxRetries} attempts:`,
            error.message,
          );
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(chargeback, payInRequest) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: chargeback.merchantId },
      });

      if (!merchant?.email) return;
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(updated, chargeback, currentUser) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: chargeback.merchantId },
      });

      if (!merchant?.webhookUrl) return;

      const webhookData = {
        event: "CHARGEBACK_STATUS_UPDATED",
        data: {
          id: updated.id,
          status: updated.status,
          previousStatus: chargeback.status,
          updatedAt: updated.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      await this.sendWebhookWithRetry(merchant.webhookUrl, webhookData, 2);
    } catch (error) {
      console.error("Error sending status change notification:", error);
    }
  }

  /**
   * Respond to chargeback dispute
   */
  async respondToChargeback(id, responseData, currentUser) {
    const chargebackId = parseInt(id);
    if (isNaN(chargebackId) || chargebackId < 1) {
      throw new Error("Invalid chargeback ID");
    }

    const chargeback = await prisma.chargeback.findUnique({
      where: { id: chargebackId },
    });

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    if (chargeback.status !== ChargebackStatus.DISPUTED) {
      throw new Error("Only disputed chargebacks can be responded to");
    }

    if (!responseData.response || responseData.response.trim().length === 0) {
      throw new Error("Response is required");
    }

    return await prisma.$transaction(async (tx) => {
      const updatedNotes = chargeback.notes
        ? `${chargeback.notes}\n---\n[Dispute Response]: ${responseData.response}`
        : responseData.response;

      const updated = await tx.chargeback.update({
        where: { id: chargebackId },
        data: {
          status: ChargebackStatus.PENDING,
          respondedAt: new Date(),
          notes: updatedNotes,
          updatedBy: currentUser.id.toString(),
        },
      });

      await tx.chargebackLog.create({
        data: {
          chargebackId: chargeback.id,
          action: "RESPONDED",
          statusBefore: ChargebackStatus.DISPUTED,
          statusAfter: ChargebackStatus.PENDING,
          description: `Responded to dispute: ${responseData.response}`,
        },
      });

      return updated;
    });
  }

  /**
   * Resolve chargeback dispute
   */
  async resolveDispute(id, resolution, notes, currentUser) {
    const chargebackId = parseInt(id);
    if (isNaN(chargebackId) || chargebackId < 1) {
      throw new Error("Invalid chargeback ID");
    }

    const chargeback = await prisma.chargeback.findUnique({
      where: { id: chargebackId },
    });

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    if (chargeback.status !== ChargebackStatus.DISPUTED) {
      throw new Error("Only disputed chargebacks can be resolved");
    }

    const result = await this.updateStatus(id, resolution, notes, currentUser);

    await this.sendDisputeResolvedWebhook(result, resolution);

    return result;
  }

  /**
   * Send dispute resolved webhook
   */
  async sendDisputeResolvedWebhook(chargeback, resolution) {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: chargeback.merchantId },
      });

      if (!merchant?.webhookUrl) return;

      const webhookData = {
        event: "CHARGEBACK_DISPUTE_RESOLVED",
        data: {
          id: chargeback.id,
          resolution: resolution,
          resolvedAt: new Date(),
        },
        timestamp: new Date().toISOString(),
      };

      await this.sendWebhookWithRetry(merchant.webhookUrl, webhookData, 2);
    } catch (error) {
      console.error("Error sending dispute resolved webhook:", error);
    }
  }

  /**
   * Reverse chargeback
   */
  async reverseChargeback(id, reason, notes, currentUser) {
    const chargebackId = parseInt(id);
    if (isNaN(chargebackId) || chargebackId < 1) {
      throw new Error("Invalid chargeback ID");
    }

    const chargeback = await prisma.chargeback.findUnique({
      where: { id: chargebackId },
    });

    if (!chargeback) {
      throw new Error("Chargeback not found");
    }

    if (chargeback.status === ChargebackStatus.REVERSED) {
      throw new Error("Chargeback already reversed");
    }

    return await this.updateStatus(
      id,
      ChargebackStatus.REVERSED,
      notes,
      currentUser,
    );
  }

  /**
   * Initiate chargeback from webhook
   */
  async initiateChargebackFromWebhook(webhookData) {
    if (!webhookData.payInRequestId) {
      throw new Error("payInRequestId is required");
    }

    const payInRequest = await prisma.payInRequest.findUnique({
      where: { id: webhookData.payInRequestId },
    });

    if (!payInRequest) {
      throw new Error("Pay-in request not found");
    }

    // Check if refund already exists
    const existingRefund = await prisma.refund.findFirst({
      where: {
        payInRequestId: payInRequest.id,
        status: { in: ["PENDING", "COMPLETED"] },
      },
    });
    if (existingRefund) {
      throw new Error(
        "A refund already exists for this transaction. Cannot create chargeback.",
      );
    }

    // Check chargeback time window (120 days)
    const chargebackWindowDays = 120;
    if (payInRequest.completedAt) {
      const daysSinceTransaction =
        (Date.now() - new Date(payInRequest.completedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceTransaction > chargebackWindowDays) {
        throw new Error(
          `Chargeback window has expired. Transactions older than ${chargebackWindowDays} days cannot be charged back.`,
        );
      }
    }

    // Check for duplicate gateway chargeback ID
    if (webhookData.gatewayChargebackId) {
      const existingGatewayChargeback = await prisma.chargeback.findFirst({
        where: { gatewayChargebackId: webhookData.gatewayChargebackId },
      });
      if (existingGatewayChargeback) {
        throw new Error(
          `Chargeback with gateway ID ${webhookData.gatewayChargebackId} already exists`,
        );
      }
    }

    // Validate amount does NOT exceed request amount
    const chargebackAmount = webhookData.amount || Number(payInRequest.amount);
    if (chargebackAmount > Number(payInRequest.amount)) {
      throw new Error(
        `Chargeback amount (${chargebackAmount}) cannot exceed original transaction amount (${payInRequest.amount})`,
      );
    }

    const chargeback = await prisma.chargeback.create({
      data: {
        payInRequestId: webhookData.payInRequestId,
        merchantId: webhookData.merchantId || payInRequest.merchantId,
        gatewayId: webhookData.gatewayId || payInRequest.gatewayId,
        amount: chargebackAmount,
        currency: webhookData.currency || payInRequest.currency || "INR",
        chargebackFee: webhookData.chargebackFee || 500,
        merchantLiability: chargebackAmount,
        status: webhookData.status || ChargebackStatus.DISPUTED,
        reason: normalizeChargebackReason(webhookData.reason),
        gatewayChargebackId: webhookData.gatewayChargebackId || null,
        notes:
          webhookData.notes ||
          "Created from gateway webhook. Requires manual admin approval.",
        metadata: webhookData.metadata || null,
        initiatedAt: webhookData.initiatedAt || new Date(),
      },
    });

    await prisma.chargebackLog.create({
      data: {
        chargebackId: chargeback.id,
        action: "CREATED",
        statusAfter: chargeback.status,
        description: `Chargeback created from gateway webhook${webhookData.gatewayChargebackId ? " (ID: " + webhookData.gatewayChargebackId + ")" : ""}. Status: ${chargeback.status}. Manual admin approval required.`,
      },
    });

    return chargeback;
  }

  /**
   * Get chargeback statistics
   */
  async getStats(period, user) {
    const where = {};

    if (user && user.role === "USER") {
      if (!user.merchantId) {
        throw new Error("No merchant associated with this user");
      }
      where.merchantId = user.merchantId;
    }

    if (period === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.initiatedAt = { gte: thirtyDaysAgo };
    } else if (period === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.initiatedAt = { gte: sevenDaysAgo };
    }

    const [
      pending,
      approved,
      rejected,
      disputed,
      resolved,
      reversed,
      totalAmount,
    ] = await Promise.all([
      prisma.chargeback.count({ where: { ...where, status: "PENDING" } }),
      prisma.chargeback.count({ where: { ...where, status: "APPROVED" } }),
      prisma.chargeback.count({ where: { ...where, status: "REJECTED" } }),
      prisma.chargeback.count({ where: { ...where, status: "DISPUTED" } }),
      prisma.chargeback.count({ where: { ...where, status: "RESOLVED" } }),
      prisma.chargeback.count({ where: { ...where, status: "REVERSED" } }),
      prisma.chargeback.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      pending,
      approved,
      rejected,
      disputed,
      resolved,
      reversed,
      totalAmount: Number(totalAmount._sum.amount || 0),
    };
  }
}

module.exports = new ChargebackService();
