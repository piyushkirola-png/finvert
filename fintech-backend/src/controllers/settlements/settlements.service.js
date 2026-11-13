const prisma = require("../../../config/prisma");
const auditLogService = require("../../services/audit-log.service");

class SettlementService {
  /**
   * Create a new settlement request
   */
  async createSettlement(merchantId, userId, amount, adminId, notes = null) {
    return await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.findUnique({
        where: { id: merchantId },
      });
      if (!userId) {
        throw new Error("userId is required");
      }
      if (!merchant) {
        throw new Error("Merchant not found");
      }

      const payInWallet = await tx.payInWallet.findFirst({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
      });
      const payOutWallet = await tx.payOutWallet.findFirst({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
      });

      const currentPayInBalance = payInWallet?.closingBalance || 0;
      const currentPayOutBalance = payOutWallet?.closingBalance || 0;

      if (currentPayInBalance < amount) {
        throw new Error(
          `Insufficient balance. Available: ₹${currentPayInBalance}, Requested: ₹${amount}`,
        );
      }

      const settlement = await tx.settlement.create({
        data: {
          merchantId,
          userId: userId,
          amount,
          status: "PENDING",
          approvalStatus: "PENDING",
          requestedAt: new Date(),
          notes: notes || "Settlement created by merchant",
          sourceWalletBalanceBefore: currentPayInBalance,
          destinationWalletBalanceBefore: currentPayOutBalance,
          createdBy: adminId,
        },
        include: {
          merchant: {
            select: { name: true, email: true, businessName: true },
          },
        },
      });

      await auditLogService.logSettlement(
        adminId,
        merchantId,
        settlement.id,
        settlement.amount,
        "CREATED",
      );

      return settlement;
    });
  }

  /**
   * Create INSTANT settlement
   */
  async createInstantSettlement(
    merchantId,
    userId,
    amount,
    adminId,
    notes = null,
  ) {
    return await prisma.$transaction(
      async (tx) => {
        if (!userId) {
          throw new Error("userId is required");
        }

        // 2) Lock & load last pay-in record
        const lockedSource = await tx.$queryRaw`
        SELECT * FROM "PayInWallet"
        WHERE "merchantId" = ${merchantId}
        AND "userId" = ${userId} 
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `;
        let sourceWallet = lockedSource[0];

        // 3) Lock & load last pay-out record
        const lockedDest = await tx.$queryRaw`
        SELECT * FROM "PayOutWallet"
        WHERE "merchantId" = ${merchantId}
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `;
        let destinationWallet = lockedDest[0];

        // Initialize wallets if missing
        if (!sourceWallet) {
          sourceWallet = await tx.payInWallet.create({
            data: {
              merchantId,
              amount: 0,
              type: "CREDIT",
              description: "Initialize PayIn Wallet",
              transactionId: `${merchantId}-init-payin-${Date.now()}`,
              transactionDate: new Date(),
              openingBalance: 0,
              closingBalance: 0,
            },
          });
        }
        if (!destinationWallet) {
          destinationWallet = await tx.payOutWallet.create({
            data: {
              merchantId,
              amount: 0,
              type: "CREDIT",
              description: "Initialize Payout Wallet",
              transactionId: `${merchantId}-init-payout-${Date.now()}`,
              transactionDate: new Date(),
              openingBalance: 0,
              closingBalance: 0,
            },
          });
        }

        const currentPayInBalance = Number(sourceWallet.closingBalance || 0);
        const currentPayOutBalance = Number(
          destinationWallet.closingBalance || 0,
        );

        // 4) Check available balance (consider any payInLien)
        const merchant = await tx.merchant.findUnique({
          where: { id: merchantId },
          select: { payInLien: true },
        });
        const availableBalance =
          currentPayInBalance - (merchant.payInLien || 0);
        if (availableBalance < amount) {
          throw new Error(
            `Insufficient balance. Available: ₹${availableBalance}, Requested: ₹${amount}`,
          );
        }

        // 5) DEBIT pay-in wallet
        const updatedSource = await tx.payInWallet.create({
          data: {
            merchantId,
            userId: userId,
            amount: amount,
            type: "DEBIT",
            description: notes || `Instant settlement of ₹${amount}`,
            transactionId: `SET_IN_${Date.now()}`,
            transactionDate: new Date(),
            openingBalance: currentPayInBalance,
            closingBalance: currentPayInBalance - amount,
          },
        });

        // 6) CREDIT pay-out wallet
        const updatedDest = await tx.payOutWallet.create({
          data: {
            merchantId,
            userId: userId,
            amount: amount,
            type: "CREDIT",
            description: notes || `Instant settlement of ₹${amount}`,
            transactionId: `SET_OUT_${Date.now()}`,
            transactionDate: new Date(),
            openingBalance: currentPayOutBalance,
            closingBalance: currentPayOutBalance + amount,
          },
        });

        // 7) Upsert PayIn Wallet Summary using merchantUser.id
        const totalPayInCredit = await tx.payInWallet.aggregate({
          where: { merchantId, userId, type: "CREDIT" },
          _sum: { amount: true },
        });
        const totalPayInDebit = await tx.payInWallet.aggregate({
          where: { merchantId, userId, type: "DEBIT" },
          _sum: { amount: true },
        });
        const freshPayInBalance =
          Number(totalPayInCredit._sum.amount || 0) -
          Number(totalPayInDebit._sum.amount || 0);

        await tx.payInWalletSummary.upsert({
          where: {
            merchantId_userId: { merchantId, userId },
          },
          update: {
            closingBalance: freshPayInBalance,
            totalInToday: 0,
            totalInThisWeek: 0,
            totalInThisMonth: 0,
            totalInThisYear: 0,
            successfulPayIns: 0,
            failedPayIns: 0,
            pendingPayIns: 0,
            totalPayIns: 0,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: new Date().toISOString(),
          },
          create: {
            merchantId: merchantId,
            userId: userId,
            closingBalance: freshPayInBalance,
            totalInToday: 0,
            totalInThisWeek: 0,
            totalInThisMonth: 0,
            totalInThisYear: 0,
            successfulPayIns: 0,
            failedPayIns: 0,
            pendingPayIns: 0,
            totalPayIns: 0,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: new Date().toISOString(),
          },
        });

        // 8) Upsert PayOut Wallet Summary using merchantUser.id
        const totalPayOutCredit = await tx.payOutWallet.aggregate({
          where: { merchantId, userId, type: "CREDIT" },
          _sum: { amount: true },
        });
        const totalPayOutDebit = await tx.payOutWallet.aggregate({
          where: { merchantId, userId, type: "DEBIT" },
          _sum: { amount: true },
        });
        const freshPayOutBalance =
          Number(totalPayOutCredit._sum.amount || 0) -
          Number(totalPayOutDebit._sum.amount || 0);

        await tx.payOutWalletSummary.upsert({
          where: {
            merchantId_userId: { merchantId, userId },
          },
          update: {
            closingBalance: freshPayOutBalance,
            totalOutToday: 0,
            totalOutThisWeek: 0,
            totalOutThisMonth: 0,
            totalOutThisYear: 0,
            successfulPayOuts: 0,
            failedPayOuts: 0,
            pendingPayOuts: 0,
            totalPayOuts: 0,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: new Date().toISOString(),
          },
          create: {
            merchantId: merchantId,
            userId: userId,
            closingBalance: freshPayOutBalance,
            totalOutToday: 0,
            totalOutThisWeek: 0,
            totalOutThisMonth: 0,
            totalOutThisYear: 0,
            successfulPayOuts: 0,
            failedPayOuts: 0,
            pendingPayOuts: 0,
            totalPayOuts: 0,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: new Date().toISOString(),
          },
        });

        // 9) Create the completed settlement record
        const settlement = await tx.settlement.create({
          data: {
            merchantId,
            userId: userId,
            amount,
            status: "COMPLETED",
            approvalStatus: "APPROVED",
            sourceWalletBalanceBefore: currentPayInBalance,
            sourceWalletBalanceAfter: currentPayInBalance - amount,
            destinationWalletBalanceBefore: currentPayOutBalance,
            destinationWalletBalanceAfter: currentPayOutBalance + amount,
            sourceWalletDebitTransactionId: updatedSource.id,
            destinationWalletCreditTransactionId: updatedDest.id,
            requestedAt: new Date(),
            approvedAt: new Date(),
            processedAt: new Date(),
            completedAt: new Date(),
            createdBy: adminId,
            approvedBy: adminId,
            notes: notes || `Instant settlement of ₹${amount} by admin`,
            metadata: {
              settlementType: "ADMIN_INSTANT",
              method: "INSTANT",
              createdByRole: "ADMIN",
            },
          },
          include: {
            merchant: {
              select: { name: true, email: true, businessName: true },
            },
          },
        });

        await auditLogService.logSettlement(
          adminId,
          merchantId,
          settlement.id,
          settlement.amount,
          "PROCESSED",
        );

        return settlement;
      },
      { timeout: 20000, isolationLevel: "Serializable" },
    );
  }

  /**
   * Manual debit from PayIn Wallet
   */
  async manualDebitPayIn(merchantId, userId, amount, adminId, notes = null) {
    return await prisma.$transaction(
      async (tx) => {
        if (!userId) {
          throw new Error("userId is required");
        }

        // 2) Lock & load last pay-in wallet
        const locked = await tx.$queryRaw`
            SELECT * FROM "PayInWallet"
            WHERE "merchantId" = ${merchantId}
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
          `;
        const last = locked[0];
        const currentBalance = Number(last?.closingBalance || 0);
        const newBalance = currentBalance - amount;
        if (newBalance < 0) {
          throw new Error(
            `Insufficient balance. Available: ₹${currentBalance}, Requested: ₹${amount}`,
          );
        }

        // 3) Create DEBIT
        const txRecord = await tx.payInWallet.create({
          data: {
            merchantId,
            userId: userId,
            amount: amount,
            type: "DEBIT",
            description: notes || `Manual debit of ₹${amount}`,
            transactionId: `MDEBIT_${Date.now()}`,
            transactionDate: new Date(),
            openingBalance: currentBalance,
            closingBalance: newBalance,
          },
        });

        // 4) Upsert PayIn Wallet Summary using merchantUser.id
        await tx.payInWalletSummary.upsert({
          where: {
            merchantId_userId: { merchantId, userId },
          },
          update: {
            closingBalance: newBalance,
            lastTransactionProcessed: new Date().toISOString(),
          },
          create: {
            merchantId,
            userId,
            closingBalance: newBalance,
            totalInToday: 0,
            totalInThisWeek: 0,
            totalInThisMonth: 0,
            totalInThisYear: 0,
            successfulPayIns: 0,
            failedPayIns: 0,
            pendingPayIns: 0,
            totalPayIns: 0,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: new Date().toISOString(),
          },
        });

        // 5) Create settlement record
        const settlement = await tx.settlement.create({
          data: {
            merchantId,
            userId: userId,
            amount,
            status: "COMPLETED",
            approvalStatus: "APPROVED",
            requestedAt: new Date(),
            processedAt: new Date(),
            completedAt: new Date(),
            notes: notes || `Manual debit settlement of ₹${amount}`,
            sourceWalletDebitTransactionId: txRecord.id,
            sourceWalletBalanceBefore: currentBalance,
            sourceWalletBalanceAfter: newBalance,
            createdBy: adminId,
            approvedBy: adminId,
          },
          include: {
            merchant: {
              select: { name: true, email: true, businessName: true },
            },
          },
        });

        return settlement;
      },
      { isolationLevel: "Serializable" },
    );
  }

  /**
   * Manual credit to Payout Wallet (Admin action)
   */
  async manualCreditPayout(merchantId, userId, amount, adminId, notes = null) {
    return await prisma.$transaction(async (tx) => {
      if (!userId) {
        throw new Error("userId is required");
      }

      // 2) Lock & load last pay-out wallet
      const locked = await tx.$queryRaw`
        SELECT * FROM "PayOutWallet"
        WHERE "merchantId" = ${merchantId}
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `;
      const last = locked[0];
      const currentBalance = Number(last?.closingBalance || 0);
      const newBalance = currentBalance + amount;

      // 3) Create CREDIT
      const txRecord = await tx.payOutWallet.create({
        data: {
          merchantId,
          userId: userId,
          amount: amount,
          type: "CREDIT",
          description: notes || `Manual credit of ₹${amount}`,
          transactionId: `MCREDIT_${Date.now()}`,
          transactionDate: new Date(),
          openingBalance: currentBalance,
          closingBalance: newBalance,
        },
      });

      // 4) Upsert PayOut Wallet Summary using merchantUser.id
      await tx.payOutWalletSummary.upsert({
        where: {
          merchantId_userId: { merchantId, userId },
        },
        update: {
          closingBalance: newBalance,
          lastTransactionProcessed: new Date().toISOString(),
        },
        create: {
          merchantId,
          userId,
          closingBalance: newBalance,
          totalOutToday: 0,
          totalOutThisWeek: 0,
          totalOutThisMonth: 0,
          totalOutThisYear: 0,
          successfulPayOuts: 0,
          failedPayOuts: 0,
          pendingPayOuts: 0,
          totalPayOuts: 0,
          netChargesToday: 0,
          netChargesThisWeek: 0,
          netChargesThisMonth: 0,
          netChargesThisYear: 0,
          lastTransactionProcessed: new Date().toISOString(),
        },
      });

      // 5) Create settlement record
      const settlement = await tx.settlement.create({
        data: {
          merchantId,
          userId: userId,
          amount,
          status: "COMPLETED",
          approvalStatus: "APPROVED",
          requestedAt: new Date(),
          processedAt: new Date(),
          completedAt: new Date(),
          notes: notes || `Manual credit settlement of ₹${amount}`,
          destinationWalletCreditTransactionId: txRecord.id,
          destinationWalletBalanceBefore: currentBalance,
          destinationWalletBalanceAfter: newBalance,
          createdBy: adminId,
          approvedBy: adminId,
        },
        include: {
          merchant: {
            select: { name: true, email: true, businessName: true },
          },
        },
      });

      return settlement;
    });
  }

  /**
   * Get all settlements (with pagination)
   */
  async getSettlements(page = 1, limit = 10, status = null, merchantId = null) {
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== "All") where.status = status;
    if (merchantId) where.merchantId = parseInt(merchantId);

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          merchant: {
            select: { name: true, email: true, businessName: true },
          },
        },
      }),
      prisma.settlement.count({ where }),
    ]);

    return {
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single settlement by ID
   */
  async getSettlementById(id) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(id) },
      include: {
        merchant: {
          select: { name: true, email: true, businessName: true, phone: true },
        },
      },
    });
    if (!settlement) {
      throw new Error("Settlement not found");
    }
    return settlement;
  }

  /**
   * Approve a pending settlement
   */
  async approveSettlement(id, adminId) {
    return await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: parseInt(id) },
      });
      if (!settlement) {
        throw new Error("Settlement not found");
      }
      if (settlement.approvalStatus !== "PENDING") {
        throw new Error("Settlement already processed");
      }
      const updated = await tx.settlement.update({
        where: { id: parseInt(id) },
        data: {
          approvalStatus: "APPROVED",
          status: "PROCESSING",
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      });
      return updated;
    });
  }

  /**
   * Reject a pending settlement
   */
  async rejectSettlement(id, adminId, reason = null) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: parseInt(id) },
    });
    if (!settlement) {
      throw new Error("Settlement not found");
    }
    if (settlement.approvalStatus !== "PENDING") {
      throw new Error("Settlement already processed");
    }
    return await prisma.settlement.update({
      where: { id: parseInt(id) },
      data: {
        approvalStatus: "REJECTED",
        status: "CANCELED",
        rejectedAt: new Date(),
        rejectedBy: adminId,
        remarks: reason,
      },
    });
  }

  /**
   * Process a settlement (mark COMPLETED)
   */
  async processSettlement(id, adminId) {
    return await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: parseInt(id) },
      });
      if (!settlement) {
        throw new Error("Settlement not found");
      }
      if (settlement.status !== "PROCESSING") {
        throw new Error("Settlement is not in processing state");
      }
      const updated = await tx.settlement.update({
        where: { id: parseInt(id) },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });
      return updated;
    });
  }

  /**
   * Export settlements to CSV data format
   */
  async exportSettlementsToCSV(filters = {}) {
    const where = {};
    if (filters.status && filters.status !== "All") {
      where.status = filters.status;
    }
    if (filters.merchantId) {
      where.merchantId = parseInt(filters.merchantId);
    }
    if (filters.startDate) {
      where.requestedAt = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.requestedAt = {
        ...where.requestedAt,
        lte: new Date(filters.endDate),
      };
    }

    const settlements = await prisma.settlement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        merchant: {
          select: { name: true, email: true, businessName: true },
        },
      },
    });

    return settlements.map((s) => ({
      "Settlement ID": s.id,
      "Merchant Name": s.merchant?.name || `Merchant ${s.merchantId}`,
      "Merchant Email": s.merchant?.email || "",
      Amount: s.amount,
      Status: s.status,
      "Approval Status": s.approvalStatus,
      "Requested Date": new Date(s.requestedAt).toLocaleString(),
      "Processed Date": s.processedAt
        ? new Date(s.processedAt).toLocaleString()
        : "",
      "Completed Date": s.completedAt
        ? new Date(s.completedAt).toLocaleString()
        : "",
      Notes: s.notes || "",
      Remarks: s.remarks || "",
    }));
  }

  /**
   * Update PayIn Wallet Summary helper
   */
  async updatePayInWalletSummary(tx, merchantId, userId) {
    const transactions = await tx.payInWallet.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });
    const last = transactions[0];
    const closingBalance = Number(last?.closingBalance || 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const totals = await tx.payInWallet.aggregate({
      where: { merchantId, transactionDate: { gte: today } },
      _sum: { amount: true },
    });
    const successfulPayIns = await tx.payInRequest.count({
      where: { merchantId, status: "COMPLETED" },
    });
    const failedPayIns = await tx.payInRequest.count({
      where: { merchantId, status: "FAILED" },
    });
    const pendingPayIns = await tx.payInRequest.count({
      where: { merchantId, status: "PENDING" },
    });

    await tx.payInWalletSummary.upsert({
      where: { merchantId_userId: { merchantId, userId } },
      update: {
        closingBalance,
        totalInToday: totals._sum.amount || 0,
        successfulPayIns,
        failedPayIns,
        pendingPayIns,
        totalPayIns: successfulPayIns + failedPayIns + pendingPayIns,
        lastTransactionProcessed: new Date().toISOString(),
      },
      create: {
        merchantId,
        userId,
        closingBalance,
        totalInToday: totals._sum.amount || 0,
        totalInThisWeek: 0,
        totalInThisMonth: 0,
        totalInThisYear: 0,
        successfulPayIns,
        failedPayIns,
        pendingPayIns,
        totalPayIns: successfulPayIns + failedPayIns + pendingPayIns,
        netChargesToday: 0,
        netChargesThisWeek: 0,
        netChargesThisMonth: 0,
        netChargesThisYear: 0,
        lastTransactionProcessed: new Date().toISOString(),
      },
    });
  }

  /**
   * Update PayOut Wallet Summary helper
   */
  async updatePayOutWalletSummary(tx, merchantId, userId) {
    const transactions = await tx.payOutWallet.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });
    const last = transactions[0];
    const closingBalance = Number(last?.closingBalance || 0);

    const successfulPayOuts = await tx.payOutRequest.count({
      where: { merchantId, status: "COMPLETED" },
    });
    const failedPayOuts = await tx.payOutRequest.count({
      where: { merchantId, status: "FAILED" },
    });
    const pendingPayOuts = await tx.payOutRequest.count({
      where: { merchantId, status: "PENDING" },
    });

    await tx.payOutWalletSummary.upsert({
      where: { merchantId_userId: { merchantId, userId } },
      update: {
        closingBalance,
        successfulPayOuts,
        failedPayOuts,
        pendingPayOuts,
        totalPayOuts: successfulPayOuts + failedPayOuts + pendingPayOuts,
        lastTransactionProcessed: new Date().toISOString(),
      },
      create: {
        merchantId,
        userId,
        closingBalance,
        totalOutToday: 0,
        totalOutThisWeek: 0,
        totalOutThisMonth: 0,
        totalOutThisYear: 0,
        successfulPayOuts,
        failedPayOuts,
        pendingPayOuts,
        totalPayOuts: successfulPayOuts + failedPayOuts + pendingPayOuts,
        netChargesToday: 0,
        netChargesThisWeek: 0,
        netChargesThisMonth: 0,
        netChargesThisYear: 0,
        lastTransactionProcessed: new Date().toISOString(),
      },
    });
  }
}

module.exports = new SettlementService();
