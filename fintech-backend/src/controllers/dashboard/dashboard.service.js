const prisma = require("../../../config/prisma");
const { getDateRange } = require("../../utils/ist.util");

const toNum = (v) => Number(v || 0);
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Turn a filter value into a number.
 * Empty value -> undefined (no filter). Bad value (like "abc") -> error.
 */
const parseId = (value, name) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid ${name}`);
  }
  return n;
};

const parseFilterIds = (filters) => ({
  merchantId: parseId(filters.merchantId, "merchantId"),
  gatewayId: parseId(filters.gatewayId, "gatewayId"),
  userId: parseId(filters.userId, "userId"),
});

/**
 * Get All Stats (All Cards)
 * 7 database queries, all running at the same time.
 */
const getStats = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const { merchantId, gatewayId, userId } = parseFilterIds(filters);

  // PayIn and PayOut both have merchantId, gatewayId, userId, requestedAt
  const requestWhere = {
    ...(merchantId ? { merchantId } : {}),
    ...(gatewayId ? { gatewayId } : {}),
    ...(userId ? { userId } : {}),
    requestedAt: { gte: startDate, lt: endDate },
  };

  // Wallet summaries have no gatewayId, so gateway filter cannot apply here
  const walletWhere = {
    ...(merchantId ? { merchantId } : {}),
    ...(userId ? { userId } : {}),
  };

  // Chargeback has no userId column, so user is checked through payInRequest
  const chargebackWhere = {
    initiatedAt: { gte: startDate, lt: endDate },
    status: "APPROVED",
    ...(merchantId ? { merchantId } : {}),
    ...(gatewayId ? { gatewayId } : {}),
    ...(userId ? { payInRequest: { userId } } : {}),
  };

  // Refund has no userId column either
  const refundWhere = {
    createdAt: { gte: startDate, lt: endDate },
    status: "COMPLETED",
    ...(merchantId ? { merchantId } : {}),
    ...(gatewayId ? { gatewayId } : {}),
    ...(userId ? { payInRequest: { userId } } : {}),
  };

  // Settlement has no gatewayId, but it has userId
  const settlementWhere = {
    status: "PENDING",
    ...(merchantId ? { merchantId } : {}),
    ...(userId ? { userId } : {}),
  };

  const [
    payinGroups,
    payoutGroups,
    payinWallet,
    payoutWallet,
    chargeback,
    refund,
    settlement,
  ] = await Promise.all([
    prisma.payInRequest.groupBy({
      by: ["status", "currency"],
      where: requestWhere,
      _count: { _all: true },
      _sum: { amount: true, amountInINR: true },
    }),
    prisma.payOutRequest.groupBy({
      by: ["status"],
      where: requestWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payInWalletSummary.aggregate({
      where: walletWhere,
      _sum: { closingBalance: true },
    }),
    prisma.payOutWalletSummary.aggregate({
      where: walletWhere,
      _sum: { closingBalance: true },
    }),
    prisma.chargeback.aggregate({
      where: chargebackWhere,
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: refundWhere,
      _sum: { amount: true },
    }),
    prisma.settlement.aggregate({
      where: settlementWhere,
      _sum: { amount: true },
    }),
  ]);

  // ---------- PayIn numbers ----------
  let payInTotal = 0;
  let payInSuccess = 0;
  let payInPending = 0;
  let payInFailed = 0;
  let payInCompletedAmount = 0; // in INR

  for (const g of payinGroups) {
    const count = g._count._all;
    payInTotal += count;
    if (g.status === "COMPLETED") {
      payInSuccess += count;
      payInCompletedAmount +=
        g.currency === "INR" ? toNum(g._sum.amount) : toNum(g._sum.amountInINR);
    } else if (g.status === "PENDING") {
      payInPending += count;
    } else if (g.status === "FAILED") {
      payInFailed += count;
    }
  }

  const payInSuccessRate =
    payInTotal > 0 ? (payInSuccess / payInTotal) * 100 : 0;
  const averagePayIn =
    payInSuccess > 0 ? payInCompletedAmount / payInSuccess : 0;

  // ---------- Payout numbers ----------
  let payoutTotal = 0;
  let payoutSuccess = 0;
  let payoutPending = 0;
  let payoutFailed = 0;
  let payoutCompletedAmount = 0;

  for (const g of payoutGroups) {
    const count = g._count._all;
    payoutTotal += count;
    if (g.status === "COMPLETED") {
      payoutSuccess += count;
      payoutCompletedAmount += toNum(g._sum.amount);
    } else if (g.status === "PENDING") {
      payoutPending += count;
    } else if (g.status === "FAILED") {
      payoutFailed += count;
    }
  }

  const payoutSuccessRate =
    payoutTotal > 0 ? (payoutSuccess / payoutTotal) * 100 : 0;
  const averagePayout =
    payoutSuccess > 0 ? payoutCompletedAmount / payoutSuccess : 0;

  return {
    currentBalance: toNum(payinWallet._sum.closingBalance),
    transactions: payInTotal,
    successRate: round1(payInSuccessRate),
    chargebackAmount: toNum(chargeback._sum.amount),
    refundAmount: toNum(refund._sum.amount),

    // PayIn
    todayPayIn: payInCompletedAmount,
    averagePayIn: round2(averagePayIn),
    successPayInCount: payInSuccess,
    pendingPayInCount: payInPending,
    failedPayInCount: payInFailed,
    payInSuccessRate: round1(payInSuccessRate),
    totalPayInTransactions: payInTotal,

    // Payout
    payoutWalletBalance: toNum(payoutWallet._sum.closingBalance),
    todayPayout: payoutCompletedAmount,
    averagePayout: round2(averagePayout),
    successPayoutCount: payoutSuccess,
    pendingPayoutCount: payoutPending,
    failedPayoutCount: payoutFailed,
    payoutSuccessRate: round1(payoutSuccessRate),
    totalPayoutTransactions: payoutTotal,

    // Settlement
    pendingSettlements: toNum(settlement._sum.amount),
  };
};

/**
 * Get Recent Transactions (latest 10) with filters
 */
const getRecentTransactions = async (filters) => {
  const { merchantId, gatewayId, userId } = parseFilterIds(filters);
  const limit = 10;

  // PayIn and PayOut have all three columns
  const requestWhere = {
    ...(merchantId ? { merchantId } : {}),
    ...(gatewayId ? { gatewayId } : {}),
    ...(userId ? { userId } : {}),
  };

  // Refund and Chargeback have no userId column, so user goes through payInRequest
  const relatedWhere = {
    ...(merchantId ? { merchantId } : {}),
    ...(gatewayId ? { gatewayId } : {}),
    ...(userId ? { payInRequest: { userId } } : {}),
  };

  const [payins, payouts, refunds, chargebacks] = await Promise.all([
    prisma.payInRequest.findMany({
      where: requestWhere,
      orderBy: { requestedAt: "desc" },
      take: limit,
      select: {
        id: true,
        merchantReference: true,
        requestedAt: true,
        amount: true,
        currency: true,
        status: true,
        merchant: { select: { name: true } },
        gateway: { select: { name: true } },
      },
    }),

    prisma.payOutRequest.findMany({
      where: requestWhere,
      orderBy: { requestedAt: "desc" },
      take: limit,
      select: {
        id: true,
        merchantReference: true,
        requestedAt: true,
        amount: true,
        status: true,
        merchant: { select: { name: true } },
        gateway: { select: { name: true } },
      },
    }),

    prisma.refund.findMany({
      where: relatedWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        amount: true,
        currency: true,
        status: true,
        merchant: { select: { name: true } },
        gateway: { select: { name: true } },
      },
    }),

    prisma.chargeback.findMany({
      where: relatedWhere,
      orderBy: { initiatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        initiatedAt: true,
        amount: true,
        currency: true,
        status: true,
        merchant: { select: { name: true } },
        gateway: { select: { name: true } },
      },
    }),
  ]);

  const allTransactions = [];

  payins.forEach((tx) => {
    allTransactions.push({
      id: `PAYIN-${tx.id}`,
      transactionId: tx.merchantReference || `PIN-${tx.id}`,
      type: "PAYIN",
      merchantName: tx.merchant?.name || "N/A",
      gatewayName: tx.gateway?.name || "N/A",
      amount: Number(tx.amount) || 0,
      currency: tx.currency || "INR",
      status: tx.status || "PENDING",
      createdAt: tx.requestedAt,
    });
  });

  payouts.forEach((tx) => {
    allTransactions.push({
      id: `PAYOUT-${tx.id}`,
      transactionId: tx.merchantReference || `POUT-${tx.id}`,
      type: "PAYOUT",
      merchantName: tx.merchant?.name || "N/A",
      gatewayName: tx.gateway?.name || "N/A",
      amount: Number(tx.amount) || 0,
      currency: "INR", // PayOutRequest has no currency column
      status: tx.status || "PENDING",
      createdAt: tx.requestedAt,
    });
  });

  refunds.forEach((tx) => {
    allTransactions.push({
      id: `REFUND-${tx.id}`,
      transactionId: `REF-${tx.id}`,
      type: "REFUND",
      merchantName: tx.merchant?.name || "N/A",
      gatewayName: tx.gateway?.name || "N/A",
      amount: Number(tx.amount) || 0,
      currency: tx.currency || "INR",
      status: tx.status || "PENDING",
      createdAt: tx.createdAt,
    });
  });

  chargebacks.forEach((tx) => {
    allTransactions.push({
      id: `CHARGEBACK-${tx.id}`,
      transactionId: `CB-${tx.id}`,
      type: "CHARGEBACK",
      merchantName: tx.merchant?.name || "N/A",
      gatewayName: tx.gateway?.name || "N/A",
      amount: Number(tx.amount) || 0,
      currency: tx.currency || "INR",
      status: tx.status || "PENDING",
      createdAt: tx.initiatedAt,
    });
  });

  // newest first, keep top 10
  allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return allTransactions.slice(0, 10);
};

module.exports = {
  getStats,
  getRecentTransactions,
};