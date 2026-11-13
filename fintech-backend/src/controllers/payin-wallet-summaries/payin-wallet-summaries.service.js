const prisma = require("../../../config/prisma");

class PayInWalletSummariesService {
  async findAll(merchantId = null, userId = null) {
    try {
      const where = {};
      if (merchantId) {
        where.merchantId = merchantId;
      }
      if (userId) {
        where.userId = userId;
      }

      const summaries = await prisma.payInWalletSummary.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
              businessName: true,
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
        orderBy: { createdAt: "desc" },
      });

      // For Admin (no merchantId), aggregate ALL summaries
      if (!merchantId && summaries.length > 0) {
        const aggregatedSummary = summaries.reduce(
          (acc, curr) => ({
            ...acc,
            closingBalance:
              Number(acc.closingBalance) + Number(curr.closingBalance),
            totalInToday: Number(acc.totalInToday) + Number(curr.totalInToday),
            totalInThisWeek:
              Number(acc.totalInThisWeek) + Number(curr.totalInThisWeek),
            totalInThisMonth:
              Number(acc.totalInThisMonth) + Number(curr.totalInThisMonth),
            totalInThisYear:
              Number(acc.totalInThisYear) + Number(curr.totalInThisYear),
            successfulPayIns: acc.successfulPayIns + curr.successfulPayIns,
            failedPayIns: acc.failedPayIns + curr.failedPayIns,
            pendingPayIns: acc.pendingPayIns + curr.pendingPayIns,
            totalPayIns: acc.totalPayIns + curr.totalPayIns,
            netChargesToday:
              Number(acc.netChargesToday) + Number(curr.netChargesToday),
            netChargesThisWeek:
              Number(acc.netChargesThisWeek) + Number(curr.netChargesThisWeek),
            netChargesThisMonth:
              Number(acc.netChargesThisMonth) +
              Number(curr.netChargesThisMonth),
            netChargesThisYear:
              Number(acc.netChargesThisYear) + Number(curr.netChargesThisYear),
            lastRefreshedAt:
              !acc.lastRefreshedAt ||
              new Date(curr.lastRefreshedAt) > new Date(acc.lastRefreshedAt)
                ? curr.lastRefreshedAt
                : acc.lastRefreshedAt,
          }),
          {
            id: 0,
            merchantId: 0,
            userId: 0,
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
          },
        );

        return {
          success: true,
          data: [aggregatedSummary],
        };
      }

      return {
        success: true,
        data: summaries,
      };
    } catch (error) {
      console.error("Error in findAll summaries service:", error);
      throw error;
    }
  }

  async findOne(merchantId, userId = null) {
    try {
      const where = { merchantId };
      if (userId) {
        where.userId = userId;
      }
      const summary = await prisma.payInWalletSummary.findFirst({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
              businessName: true,
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

      if (!summary) {
        throw new Error("Wallet summary not found for this merchant");
      }

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error("Error in findOne summary service:", error);
      throw error;
    }
  }

  async refreshSummary(merchantId, userId = null) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        let lockedSummary;
        if (userId !== null) {
          lockedSummary = await tx.$queryRaw`
          SELECT * FROM "PayInWalletSummary" 
          WHERE "merchantId" = ${merchantId}
            AND "userId" = ${userId}
          FOR UPDATE
        `;
        } else {
          lockedSummary = await tx.$queryRaw`
          SELECT * FROM "PayInWalletSummary" 
          WHERE "merchantId" = ${merchantId}
            AND "userId" IS NULL
          FOR UPDATE
        `;
        }

        const now = new Date();
        const startOfDayUTC = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0,
            0,
          ),
        );
        const startOfWeekUTC = new Date(startOfDayUTC);
        startOfWeekUTC.setUTCDate(
          startOfWeekUTC.getUTCDate() - startOfWeekUTC.getUTCDay(),
        );
        const startOfMonthUTC = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
        );
        const startOfYearUTC = new Date(
          Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0),
        );

        const payinWhere = { merchantId };
        if (userId) {
          payinWhere.userId = userId;
        }

        const walletWhere = { merchantId };
        if (userId) {
          walletWhere.userId = userId;
        }

        const totalCredit = await tx.payInWallet.aggregate({
          where: { ...walletWhere, type: "CREDIT" },
          _sum: { amount: true },
        });
        const totalDebit = await tx.payInWallet.aggregate({
          where: { ...walletWhere, type: "DEBIT" },
          _sum: { amount: true },
        });
        const closingBalance =
          Number(totalCredit._sum.amount || 0) -
          Number(totalDebit._sum.amount || 0);

        const lastTransaction = await tx.payInWallet.findFirst({
          where: walletWhere,
          orderBy: { transactionDate: "desc" },
          select: { id: true },
        });

        const [
          todayAggregates,
          weekAggregates,
          monthAggregates,
          yearAggregates,
        ] = await Promise.all([
          tx.payInRequest.aggregate({
            where: {
              ...payinWhere,
              status: "COMPLETED",
              requestedAt: { gte: startOfDayUTC },
            },
            _sum: {
              amount: true,
              feeAmount: true,
              taxAmount: true,
              amountToCredit: true,
            },
            _count: true,
          }),
          tx.payInRequest.aggregate({
            where: {
              ...payinWhere,
              status: "COMPLETED",
              requestedAt: { gte: startOfWeekUTC },
            },
            _sum: {
              amount: true,
              feeAmount: true,
              taxAmount: true,
              amountToCredit: true,
            },
          }),
          tx.payInRequest.aggregate({
            where: {
              ...payinWhere,
              status: "COMPLETED",
              requestedAt: { gte: startOfMonthUTC },
            },
            _sum: {
              amount: true,
              feeAmount: true,
              taxAmount: true,
              amountToCredit: true,
            },
          }),
          tx.payInRequest.aggregate({
            where: {
              ...payinWhere,
              status: "COMPLETED",
              requestedAt: { gte: startOfYearUTC },
            },
            _sum: {
              amount: true,
              feeAmount: true,
              taxAmount: true,
              amountToCredit: true,
            },
          }),
        ]);

        const [successfulCount, failedCount, pendingCount, disputedCount] =
          await Promise.all([
            tx.payInRequest.count({
              where: {
                ...payinWhere,
                status: "COMPLETED",
                requestedAt: { gte: startOfDayUTC },
              },
            }),
            tx.payInRequest.count({
              where: {
                ...payinWhere,
                status: "FAILED",
                requestedAt: { gte: startOfDayUTC },
              },
            }),
            tx.payInRequest.count({
              where: {
                ...payinWhere,
                status: "PENDING",
                requestedAt: { gte: startOfDayUTC },
              },
            }),
            tx.payInRequest.count({
              where: {
                ...payinWhere,
                status: "DISPUTED",
                requestedAt: { gte: startOfDayUTC },
              },
            }),
          ]);

        const calculateTotal = (aggregate) => {
          const credit = Number(aggregate._sum.amountToCredit || 0);
          const fee = Number(aggregate._sum.feeAmount || 0);
          const tax = Number(aggregate._sum.taxAmount || 0);
          return credit + fee + tax;
        };

        const calculateNetCharges = (aggregate) => {
          return (
            Number(aggregate._sum.feeAmount || 0) +
            Number(aggregate._sum.taxAmount || 0)
          );
        };

        const totalInToday = calculateTotal(todayAggregates);
        const totalInThisWeek = calculateTotal(weekAggregates);
        const totalInThisMonth = calculateTotal(monthAggregates);
        const totalInThisYear = calculateTotal(yearAggregates);

        const netChargesToday = calculateNetCharges(todayAggregates);
        const netChargesThisWeek = calculateNetCharges(weekAggregates);
        const netChargesThisMonth = calculateNetCharges(monthAggregates);
        const netChargesThisYear = calculateNetCharges(yearAggregates);

        const totalPayIns =
          successfulCount + failedCount + pendingCount + disputedCount;

        const summaryData = {
          closingBalance,
          totalInToday,
          totalInThisWeek,
          totalInThisMonth,
          totalInThisYear,
          successfulPayIns: successfulCount,
          failedPayIns: failedCount,
          pendingPayIns: pendingCount,
          totalPayIns,
          netChargesToday,
          netChargesThisWeek,
          netChargesThisMonth,
          netChargesThisYear,
          lastTransactionProcessed: lastTransaction?.id?.toString() || "",
          lastRefreshedAt: new Date(),
          updatedAt: new Date(),
        };

        const summaryUserId = userId || null;
        const summary = await tx.payInWalletSummary.upsert({
          where: { merchantId_userId: { merchantId, userId: summaryUserId } },
          update: summaryData,
          create: {
            merchantId,
            userId: summaryUserId,
            ...summaryData,
            createdAt: new Date(),
          },
        });

        return summary;
      });

      return {
        success: true,
        data: result,
        message: "Summary refreshed successfully",
      };
    } catch (error) {
      console.error("Error in refreshSummary service:", error);
      throw error;
    }
  }

  async refreshAllSummaries() {
    try {
      const users = await prisma.user.findMany({
        where: { merchantId: { not: null } },
        select: { id: true, merchantId: true },
      });

      let successCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          await this.refreshSummary(user.merchantId, user.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to refresh user ${user.id}:`, error.message);
          failureCount++;
        }
      }

      return {
        success: true,
        message: `Refreshed ${successCount} users successfully, ${failureCount} failed`,
        data: { totalUsers: users.length, successCount, failureCount },
      };
    } catch (error) {
      console.error("Error in refreshAllSummaries service:", error);
      throw error;
    }
  }
}

module.exports = new PayInWalletSummariesService();
