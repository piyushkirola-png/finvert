const prisma = require("../../../config/prisma");

class PayinWalletService {
  /**
   * Get wallet transactions with filtering and pagination
   */
  async getWalletTransactions(filters = {}) {
    try {
      const {
        offset = 0,
        limit = 10,
        type,
        merchantId,
        userId,
        transactionId,
        referenceId,
        search,
        amountMin,
        amountMax,
        startDate,
        endDate,
      } = filters;

      const where = {};

      // Apply filters
      if (type && type !== "All") {
        where.type = type;
      }

      if (merchantId) {
        where.merchantId = parseInt(merchantId);
      }

      if (userId) {
        where.userId = parseInt(userId);
      }

      if (transactionId) {
        where.transactionId = { contains: transactionId };
      }

      if (referenceId) {
        where.referenceId = { contains: referenceId, mode: "insensitive" };
      }

      if (search) {
        where.description = { contains: search, mode: "insensitive" };
      }

      if (amountMin || amountMax) {
        where.amount = {};
        if (amountMin) where.amount.gte = parseFloat(amountMin);
        if (amountMax) where.amount.lte = parseFloat(amountMax);
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) {
          where.transactionDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.transactionDate.lte = new Date(endDate);
        }
      }
      // Run the count and the list at the same time
      const [total, data] = await Promise.all([
        prisma.payInWallet.count({ where }),
        prisma.payInWallet.findMany({
          where,
          skip: parseInt(offset),
          take: parseInt(limit),
          orderBy: { transactionDate: "desc" },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        }),
      ]);

      return {
        success: true,
        data,
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
      };
    } catch (error) {
      console.error("Error in getWalletTransactions:", error);
      throw error;
    }
  }

  /**
   * Get wallet summary
   */
  async getWalletSummary(filters = {}) {
    try {
      const { merchantId, userId } = filters;

      const where = {};
      if (merchantId) {
        where.merchantId = parseInt(merchantId);
      }
      if (userId) {
        where.userId = parseInt(userId);
      }

      const data = await prisma.payInWalletSummary.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Return first record or empty object
      const summary = data[0] || {
        merchantId: merchantId ? parseInt(merchantId) : null,
        closingBalance: 0,
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
        lastTransactionProcessed: "",
        lastRefreshedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error("Error in getWalletSummary:", error);
      throw error;
    }
  }

  /**
   * Export transactions to CSV
   */
  async exportTransactionsToCSV(filters = {}) {
    try {
      const {
        type,
        merchantId,
        transactionId,
        search,
        amountMin,
        amountMax,
        startDate,
        endDate,
      } = filters;

      const where = {};

      // Apply same filters
      if (type && type !== "All") where.type = type;
      if (merchantId) where.merchantId = parseInt(merchantId);
      if (transactionId) where.transactionId = { contains: transactionId };
      if (search) where.description = { contains: search, mode: "insensitive" };

      if (amountMin || amountMax) {
        where.amount = {};
        if (amountMin) where.amount.gte = parseFloat(amountMin);
        if (amountMax) where.amount.lte = parseFloat(amountMax);
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) {
          where.transactionDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.transactionDate.lte = new Date(endDate);
        }
      }

      const transactions = await prisma.payInWallet.findMany({
        where,
        orderBy: { transactionDate: "desc" },
        include: {
          merchant: {
            select: { name: true },
          },
        },
      });

      return transactions;
    } catch (error) {
      console.error("Error in exportTransactionsToCSV:", error);
      throw error;
    }
  }

  /**
   * Get single wallet transaction by ID
   */
  async getWalletTransactionById(id) {
    try {
      const transaction = await prisma.payInWallet.findUnique({
        where: { id: parseInt(id) },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      console.error("Error in getWalletTransactionById:", error);
      throw error;
    }
  }

  /**
   * Get merchant specific transactions
   */
  async getMerchantTransactions(merchantId, filters = {}) {
    try {
      const { offset = 0, limit = 10 } = filters;

      const where = { merchantId: parseInt(merchantId) };

      const total = await prisma.payInWallet.count({ where });

      const data = await prisma.payInWallet.findMany({
        where,
        skip: parseInt(offset),
        take: parseInt(limit),
        orderBy: { transactionDate: "desc" },
      });

      return {
        success: true,
        data,
        total,
        offset: parseInt(offset),
        limit: parseInt(limit),
      };
    } catch (error) {
      console.error("Error in getMerchantTransactions:", error);
      throw error;
    }
  }

  // CHARGEBACK WALLET METHODS
  /**
   * Process chargeback wallet debit (for chargeback integration)
   */
  async processChargebackDebit(merchantId, amount, reference, chargebackId) {
    try {
      const { TransactionType } = require("@prisma/client");

      const result = await prisma.$transaction(async (tx) => {
        const merchantUser = await tx.user.findFirst({
          where: {
            merchantId: parseInt(merchantId),
            role: "USER",
          },
          orderBy: { id: "asc" },
        });

        if (!merchantUser) {
          throw new Error(`No merchant user found for merchant: ${merchantId}`);
        }

        const lockedWallet = await tx.$queryRaw`
          SELECT * FROM "PayInWallet"
          WHERE "merchantId" = ${parseInt(merchantId)}
            AND "userId" = ${merchantUser.id}
          ORDER BY id DESC 
          LIMIT 1 
          FOR UPDATE
        `;
        const lastWallet = lockedWallet[0];

        const openingBalance = lastWallet?.closingBalance || 0;
        const closingBalance = Number(openingBalance) - Number(amount);

        const walletTransaction = await tx.payInWallet.create({
          data: {
            merchantId: parseInt(merchantId),
            userId: merchantUser.id,
            amount: amount,
            type: TransactionType.DEBIT,
            description: `Chargeback - ${reference}`,
            transactionId: chargebackId.toString(),
            transactionDate: new Date(),
            openingBalance: openingBalance,
            closingBalance: closingBalance,
          },
        });

        // Recalculate all totals
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const [todayTotal, weekTotal, monthTotal, yearTotal] =
          await Promise.all([
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfDay },
              },
              _sum: { amount: true },
            }),
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfWeek },
              },
              _sum: { amount: true },
            }),
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfMonth },
              },
              _sum: { amount: true },
            }),
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfYear },
              },
              _sum: { amount: true },
            }),
          ]);

        const [successful, failed, pending] = await Promise.all([
          tx.payInRequest.count({
            where: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
              status: "COMPLETED",
              requestedAt: { gte: startOfDay },
            },
          }),
          tx.payInRequest.count({
            where: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
              status: "FAILED",
              requestedAt: { gte: startOfDay },
            },
          }),
          tx.payInRequest.count({
            where: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
              status: "PENDING",
              requestedAt: { gte: startOfDay },
            },
          }),
        ]);

        await tx.payInWalletSummary.upsert({
          where: {
            merchantId_userId: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
            },
          },
          update: {
            closingBalance: closingBalance,
            totalInToday: Number(todayTotal._sum.amount || 0),
            totalInThisWeek: Number(weekTotal._sum.amount || 0),
            totalInThisMonth: Number(monthTotal._sum.amount || 0),
            totalInThisYear: Number(yearTotal._sum.amount || 0),
            successfulPayIns: successful,
            failedPayIns: failed,
            pendingPayIns: pending,
            totalPayIns: successful + failed + pending,
            updatedAt: new Date(),
          },
          create: {
            merchantId: parseInt(merchantId),
            userId: merchantUser.id,
            closingBalance: closingBalance,
            totalInToday: Number(todayTotal._sum.amount || 0),
            totalInThisWeek: Number(weekTotal._sum.amount || 0),
            totalInThisMonth: Number(monthTotal._sum.amount || 0),
            totalInThisYear: Number(yearTotal._sum.amount || 0),
            successfulPayIns: successful,
            failedPayIns: failed,
            pendingPayIns: pending,
            totalPayIns: successful + failed + pending,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: "",
            lastRefreshedAt: new Date(),
          },
        });

        return walletTransaction;
      });

      return result;
    } catch (error) {
      console.error("Error in processChargebackDebit:", error);
      throw error;
    }
  }

  /**
   * Process chargeback reversal (credit back the amount)
   */
  async processChargebackReversal(merchantId, amount, reference, chargebackId) {
    try {
      const { TransactionType } = require("@prisma/client");

      const result = await prisma.$transaction(async (tx) => {
        const merchantUser = await tx.user.findFirst({
          where: {
            merchantId: parseInt(merchantId),
            role: "USER",
          },
          orderBy: { id: "asc" },
        });

        if (!merchantUser) {
          throw new Error(`No merchant user found for merchant: ${merchantId}`);
        }

        const lockedWallet = await tx.$queryRaw`
          SELECT * FROM "PayInWallet" 
          WHERE "merchantId" = ${parseInt(merchantId)}
            AND "userId" = ${merchantUser.id}
          ORDER BY id DESC 
          LIMIT 1 
          FOR UPDATE
        `;
        const lastWallet = lockedWallet[0];

        const openingBalance = lastWallet?.closingBalance || 0;
        const closingBalance = Number(openingBalance) + Number(amount);

        const walletTransaction = await tx.payInWallet.create({
          data: {
            merchantId: parseInt(merchantId),
            userId: merchantUser.id,
            amount: amount,
            type: TransactionType.CREDIT,
            description: `Chargeback reversed - ${reference}`,
            transactionId: chargebackId.toString(),
            transactionDate: new Date(),
            openingBalance: openingBalance,
            closingBalance: closingBalance,
          },
        });

        // Recalculate all totals
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const [todayTotal, weekTotal, monthTotal, yearTotal] =
          await Promise.all([
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfDay },
              },
              _sum: { amount: true },
            }),
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfWeek },
              },
              _sum: { amount: true },
            }),
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfMonth },
              },
              _sum: { amount: true },
            }),
            tx.payInWallet.aggregate({
              where: {
                merchantId: parseInt(merchantId),
                userId: merchantUser.id,
                type: "CREDIT",
                transactionDate: { gte: startOfYear },
              },
              _sum: { amount: true },
            }),
          ]);

        const [successful, failed, pending] = await Promise.all([
          tx.payInRequest.count({
            where: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
              status: "COMPLETED",
              requestedAt: { gte: startOfDay },
            },
          }),
          tx.payInRequest.count({
            where: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
              status: "FAILED",
              requestedAt: { gte: startOfDay },
            },
          }),
          tx.payInRequest.count({
            where: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
              status: "PENDING",
              requestedAt: { gte: startOfDay },
            },
          }),
        ]);

        await tx.payInWalletSummary.upsert({
          where: {
            merchantId_userId: {
              merchantId: parseInt(merchantId),
              userId: merchantUser.id,
            },
          },
          update: {
            closingBalance: closingBalance,
            totalInToday: Number(todayTotal._sum.amount || 0),
            totalInThisWeek: Number(weekTotal._sum.amount || 0),
            totalInThisMonth: Number(monthTotal._sum.amount || 0),
            totalInThisYear: Number(yearTotal._sum.amount || 0),
            successfulPayIns: successful,
            failedPayIns: failed,
            pendingPayIns: pending,
            totalPayIns: successful + failed + pending,
            updatedAt: new Date(),
          },
          create: {
            merchantId: parseInt(merchantId),
            userId: merchantUser.id,
            closingBalance: closingBalance,
            totalInToday: Number(todayTotal._sum.amount || 0),
            totalInThisWeek: Number(weekTotal._sum.amount || 0),
            totalInThisMonth: Number(monthTotal._sum.amount || 0),
            totalInThisYear: Number(yearTotal._sum.amount || 0),
            successfulPayIns: successful,
            failedPayIns: failed,
            pendingPayIns: pending,
            totalPayIns: successful + failed + pending,
            netChargesToday: 0,
            netChargesThisWeek: 0,
            netChargesThisMonth: 0,
            netChargesThisYear: 0,
            lastTransactionProcessed: "",
            lastRefreshedAt: new Date(),
          },
        });

        return walletTransaction;
      });

      return result;
    } catch (error) {
      console.error("Error in processChargebackReversal:", error);
      throw error;
    }
  }
}

module.exports = new PayinWalletService();
