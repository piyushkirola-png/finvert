const prisma = require("../../../config/prisma");

class PayoutWalletService {
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

      if (type && type !== "All") {
        where.type = type;
      }

      if (merchantId) {
        where.merchantId = merchantId;
      }

      if (userId) {
        where.userId = userId;
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
        if (amountMin) where.amount.gte = amountMin;
        if (amountMax) where.amount.lte = amountMax;
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) {
          where.transactionDate.gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          where.transactionDate.lte = endDateTime;
        }
      }

      const [total, data] = await Promise.all([
        prisma.payOutWallet.count({ where }),
        prisma.payOutWallet.findMany({
          where,
          skip: offset,
          take: limit,
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
        offset,
        limit,
      };
    } catch (error) {
      console.error("Error in getWalletTransactions:", error);
      throw error;
    }
  }

  // userId FILTER
  async getWalletSummary(filters = {}) {
    const { merchantId, userId } = filters;
    try {
      const where = {};
      if (merchantId) {
        where.merchantId = merchantId;
      }
      if (userId) {
        where.userId = userId;
      }

      const data = await prisma.payOutWalletSummary.findMany({
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

      const summary = data[0] || {
        merchantId: merchantId || null,
        userId: userId || null,
        closingBalance: 0,
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
        lastTransactionProcessed: "",
        lastRefreshedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        data: {
          ...summary,
          totalChargesToday:
            summary.totalChargesToday ?? summary.netChargesToday ?? 0,
          successRate:
            summary.totalPayOuts > 0
              ? Number(
                  (
                    (summary.successfulPayOuts / summary.totalPayOuts) *
                    100
                  ).toFixed(1),
                )
              : 0,
        },
      };
    } catch (error) {
      console.error("Error in getWalletSummary:", error);
      throw error;
    }
  }

  async exportTransactionsToCSV(filters = {}) {
    try {
      const {
        type,
        merchantId,
        userId,
        transactionId,
        search,
        amountMin,
        amountMax,
        startDate,
        endDate,
      } = filters;

      const where = {};

      if (type && type !== "All") where.type = type;
      if (merchantId) where.merchantId = merchantId;
      if (userId) where.userId = userId;
      if (transactionId) where.transactionId = { contains: transactionId };
      if (search) where.description = { contains: search, mode: "insensitive" };

      if (amountMin || amountMax) {
        where.amount = {};
        if (amountMin) where.amount.gte = amountMin;
        if (amountMax) where.amount.lte = amountMax;
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) {
          where.transactionDate.gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          where.transactionDate.lte = endDateTime;
        }
      }

      const transactions = await prisma.payOutWallet.findMany({
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

  async getWalletTransactionById(id) {
    try {
      const transaction = await prisma.payOutWallet.findUnique({
        where: { id },
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

  async getMerchantTransactions(merchantId, filters = {}) {
    try {
      const { offset = 0, limit = 10 } = filters;

      const where = { merchantId };

      const total = await prisma.payOutWallet.count({ where });

      const data = await prisma.payOutWallet.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { transactionDate: "desc" },
      });

      return {
        success: true,
        data,
        total,
        offset,
        limit,
      };
    } catch (error) {
      console.error("Error in getMerchantTransactions:", error);
      throw error;
    }
  }

  // HELPER METHOD FOR BALANCE CALCULATION
  async getCurrentBalance(merchantId, userId = null) {
    try {
      const where = { merchantId };
      if (userId) {
        where.userId = userId;
      }

      const lastWallet = await prisma.payOutWallet.findFirst({
        where,
        orderBy: { id: "desc" },
      });

      return {
        success: true,
        balance: lastWallet?.closingBalance || 0,
        lastTransaction: lastWallet || null,
      };
    } catch (error) {
      console.error("Error in getCurrentBalance:", error);
      throw error;
    }
  }

  // Add this method to the PayoutWalletService class
  async getAllMerchantBalances() {
    try {
      // Get all active merchants
      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Get latest wallet for each merchant
      const balances = await Promise.all(
        merchants.map(async (merchant) => {
          const lastWallet = await prisma.payOutWallet.findFirst({
            where: { merchantId: merchant.id },
            orderBy: { id: "desc" },
          });

          return {
            ...merchant,
            balance: lastWallet?.closingBalance || 0,
            lastTransaction: lastWallet || null,
          };
        }),
      );

      return balances;
    } catch (error) {
      console.error("Error in getAllMerchantBalances:", error);
      throw error;
    }
  }
}

module.exports = new PayoutWalletService();
