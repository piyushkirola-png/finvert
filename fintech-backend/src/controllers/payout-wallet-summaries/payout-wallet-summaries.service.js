const prisma = require("../../../config/prisma");

class PayoutWalletSummaryService {
  async getSummary(merchantId, userId = null) {
    try {
      const where = { merchantId };
      if (userId) {
        where.userId = userId;
      }
      const summary = await prisma.payOutWalletSummary.findFirst({
        where: { merchantId },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!summary) {
        const lastWallet = await prisma.payOutWallet.findFirst({
          where: { merchantId },
          orderBy: { id: "desc" },
        });

        const newSummary = await prisma.payOutWalletSummary.create({
          data: {
            merchantId,
            userId: null,
            closingBalance: lastWallet?.closingBalance || 0,
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
          },
        });

        return newSummary;
      }

      return summary;
    } catch (error) {
      console.error("Error in getSummary:", error);
      throw error;
    }
  }

  async getAllSummaries(filters = {}) {
    try {
      const { merchantId, userId, limit = 50 } = filters;

      const where = {};
      if (merchantId) {
        where.merchantId = merchantId;
      }
      if (userId) {
        where.userId = userId;
      }

      const summaries = await prisma.payOutWalletSummary.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return summaries;
    } catch (error) {
      console.error("Error in getAllSummaries:", error);
      throw error;
    }
  }

  async refreshSummary(merchantId, userId = null) {
    try {
      // If userId is not provided, find one
      if (!userId) {
        const merchantUser = await prisma.user.findFirst({
          where: { merchantId, role: "USER" },
          orderBy: { id: "asc" },
        });
        userId = merchantUser?.id || null;
      }

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Filter payouts by userId
      const payoutWhere = { merchantId, status: "COMPLETED" };
      if (userId) {
        payoutWhere.userId = userId;
      }

      const completedPayouts = await prisma.payOutRequest.findMany({
        where: payoutWhere,
        select: {
          amount: true,
          feeAmount: true,
          taxAmount: true,
          completedAt: true,
        },
      });

      const todayPayouts = completedPayouts.filter(
        (p) => p.completedAt && p.completedAt >= startOfDay,
      );
      const totalOutToday = todayPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const chargesToday = todayPayouts.reduce(
        (sum, p) => sum + Number(p.feeAmount || 0) + Number(p.taxAmount || 0),
        0,
      );

      const weekPayouts = completedPayouts.filter(
        (p) => p.completedAt && p.completedAt >= startOfWeek,
      );
      const totalOutThisWeek = weekPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const chargesThisWeek = weekPayouts.reduce(
        (sum, p) => sum + Number(p.feeAmount || 0) + Number(p.taxAmount || 0),
        0,
      );

      const monthPayouts = completedPayouts.filter(
        (p) => p.completedAt && p.completedAt >= startOfMonth,
      );
      const totalOutThisMonth = monthPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const chargesThisMonth = monthPayouts.reduce(
        (sum, p) => sum + Number(p.feeAmount || 0) + Number(p.taxAmount || 0),
        0,
      );

      const yearPayouts = completedPayouts.filter(
        (p) => p.completedAt && p.completedAt >= startOfYear,
      );
      const totalOutThisYear = yearPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const chargesThisYear = yearPayouts.reduce(
        (sum, p) => sum + Number(p.feeAmount || 0) + Number(p.taxAmount || 0),
        0,
      );

      // Count payouts by userId
      const payoutCountWhere = { merchantId };
      if (userId) {
        payoutCountWhere.userId = userId;
      }

      const successfulPayOuts = await prisma.payOutRequest.count({
        where: { ...payoutCountWhere, status: "COMPLETED" },
      });
      const failedPayOuts = await prisma.payOutRequest.count({
        where: { ...payoutCountWhere, status: "FAILED" },
      });
      const pendingPayOuts = await prisma.payOutRequest.count({
        where: { ...payoutCountWhere, status: "PENDING" },
      });

      const totalPayOuts = successfulPayOuts + failedPayOuts + pendingPayOuts;

      // Filter wallet balance by userId
      const walletWhere = { merchantId };
      if (userId) {
        walletWhere.userId = userId;
      }

      const totalCredit = await prisma.payOutWallet.aggregate({
        where: { ...walletWhere, type: "CREDIT" },
        _sum: { amount: true },
      });
      const totalDebit = await prisma.payOutWallet.aggregate({
        where: { ...walletWhere, type: "DEBIT" },
        _sum: { amount: true },
      });
      const netBalance =
        Number(totalCredit._sum.amount || 0) -
        Number(totalDebit._sum.amount || 0);

      const lastWallet = await prisma.payOutWallet.findFirst({
        where: walletWhere,
        orderBy: { id: "desc" },
      });

      // Use composite key merchantId_userId
      const summary = await prisma.payOutWalletSummary.upsert({
        where: {
          merchantId_userId: {
            merchantId: merchantId,
            userId: userId ?? 0,
          },
        },
        update: {
          closingBalance: netBalance,
          totalOutToday,
          totalOutThisWeek,
          totalOutThisMonth,
          totalOutThisYear,
          successfulPayOuts,
          failedPayOuts,
          pendingPayOuts,
          totalPayOuts,
          netChargesToday: chargesToday,
          netChargesThisWeek: chargesThisWeek,
          netChargesThisMonth: chargesThisMonth,
          netChargesThisYear: chargesThisYear,
          lastTransactionProcessed: lastWallet?.id?.toString() || "",
          lastRefreshedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          merchantId,
          userId: userId,
          closingBalance: netBalance,
          totalOutToday,
          totalOutThisWeek,
          totalOutThisMonth,
          totalOutThisYear,
          successfulPayOuts,
          failedPayOuts,
          pendingPayOuts,
          totalPayOuts,
          netChargesToday: chargesToday,
          netChargesThisWeek: chargesThisWeek,
          netChargesThisMonth: chargesThisMonth,
          netChargesThisYear: chargesThisYear,
          lastTransactionProcessed: lastWallet?.id?.toString() || "",
          lastRefreshedAt: new Date(),
        },
      });

      return summary;
    } catch (error) {
      console.error("Error in refreshSummary:", error);
      throw error;
    }
  }
}

module.exports = new PayoutWalletSummaryService();
