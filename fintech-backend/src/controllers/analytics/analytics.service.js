const prisma = require("../../../config/prisma");

/**
 * Build WHERE clause from filters
 */
const buildWhereClause = (filters) => {
  const where = {};

  if (filters.merchantId) {
    where.merchantId = parseInt(filters.merchantId);
  }
  if (filters.gatewayId) {
    where.gatewayId = parseInt(filters.gatewayId);
  }
  if (filters.userId) {
    where.userId = parseInt(filters.userId);
  }

  return where;
};

/**
 * Helper: Get total amount in INR for PayIn
 */
const getTotalAmountInINR = async (whereClause) => {
  const inrResult = await prisma.payInRequest.aggregate({
    where: {
      ...whereClause,
      currency: "INR",
    },
    _sum: { amount: true },
  });

  const nonInrResult = await prisma.payInRequest.aggregate({
    where: {
      ...whereClause,
      currency: { not: "INR" },
    },
    _sum: { amountInINR: true },
  });

  return (
    Number(inrResult._sum.amount || 0) +
    Number(nonInrResult._sum.amountInINR || 0)
  );
};

/**
 * Get date range from filters
 */
const getDateRange = (filters) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate = null;
  let endDate = null;
  const dateRange = filters.dateRange || "today";

  switch (dateRange) {
    case "today":
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "previousDay":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "week":
      const weekStart = new Date(today);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      startDate = weekStart;
      endDate = weekEnd;
      break;

    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      startDate = monthStart;
      endDate = monthEnd;
      break;

    case "last3months":
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      startDate = threeMonthsAgo;
      endDate = yesterday;
      break;

    case "custom":
      if (filters.customStartDate && filters.customEndDate) {
        startDate = new Date(filters.customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(filters.customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
      break;

    default:
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

/**
 * Get days array between start and end date
 */
const getDaysArray = (startDate, endDate) => {
  const days = [];
  const current = new Date(startDate);
  while (current < endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

/**
 * Get hours array between start and end date
 */
const getHoursArray = (startDate, endDate) => {
  const allowedHours = [7, 9, 11, 13, 15, 17, 19, 21, 23];

  // base day = startDate ka local calendar date
  const baseDay = new Date(startDate);
  baseDay.setHours(0, 0, 0, 0);

  const hours = [];
  for (const h of allowedHours) {
    const slot = new Date(baseDay);
    slot.setHours(h, 0, 0, 0);
    hours.push(slot);
  }
  return hours;
};

/**
 * 1. Transaction Volume Chart
 */
const getTransactionVolume = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const whereClause = buildWhereClause(filters);

  const days = getDaysArray(startDate, endDate);
  const dates = [];
  const payinSuccess = [];
  const payinPending = [];
  const payinFailed = [];
  const payoutSuccess = [];
  const payoutPending = [];
  const payoutFailed = [];
  const refundData = [];
  const chargebackData = [];

  for (const day of days) {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    dates.push(
      day.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );

    // Get PAYIN volume
    const payinSuccessAmount = await getTotalAmountInINR({
      ...whereClause,
      status: "COMPLETED",
      requestedAt: { gte: day, lt: nextDay },
    });
    payinSuccess.push(payinSuccessAmount);

    const payinPendingAmount = await getTotalAmountInINR({
      ...whereClause,
      status: "PENDING",
      requestedAt: { gte: day, lt: nextDay },
    });
    payinPending.push(payinPendingAmount);

    const payinFailedAmount = await getTotalAmountInINR({
      ...whereClause,
      status: "FAILED",
      requestedAt: { gte: day, lt: nextDay },
    });
    payinFailed.push(payinFailedAmount);

    // Get PAYOUT volume
    const payoutSuccessResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "COMPLETED",
        requestedAt: { gte: day, lt: nextDay },
      },
      _sum: { amount: true },
    });
    payoutSuccess.push(Number(payoutSuccessResult._sum.amount || 0));

    const payoutPendingResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "PENDING",
        requestedAt: { gte: day, lt: nextDay },
      },
      _sum: { amount: true },
    });
    payoutPending.push(Number(payoutPendingResult._sum.amount || 0));

    const payoutFailedResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "FAILED",
        requestedAt: { gte: day, lt: nextDay },
      },
      _sum: { amount: true },
    });
    payoutFailed.push(Number(payoutFailedResult._sum.amount || 0));

    // Get REFUND volume for this day
    const refundWhere = {
      createdAt: { gte: day, lt: nextDay },
      status: "COMPLETED",
      payInRequest: {
        merchantId: whereClause.merchantId || undefined,
        userId: whereClause.userId || undefined,
        gatewayId: whereClause.gatewayId || undefined,
      },
    };
    Object.keys(refundWhere.payInRequest).forEach(
      (key) =>
        refundWhere.payInRequest[key] === undefined &&
        delete refundWhere.payInRequest[key],
    );
    const refundResult = await prisma.refund.aggregate({
      where: refundWhere,
      _sum: { amount: true },
    });
    refundData.push(Number(refundResult._sum.amount || 0));

    // Get CHARGEBACK volume for this day
    const chargebackWhere = {
      initiatedAt: { gte: day, lt: nextDay },
      status: "APPROVED",
      merchantId: whereClause.merchantId || undefined,
      gatewayId: whereClause.gatewayId || undefined,
    };
    Object.keys(chargebackWhere).forEach(
      (key) =>
        chargebackWhere[key] === undefined && delete chargebackWhere[key],
    );
    if (whereClause.userId) {
      chargebackWhere.payInRequest = { userId: whereClause.userId };
    }
    const chargebackResult = await prisma.chargeback.aggregate({
      where: chargebackWhere,
      _sum: { amount: true },
    });
    chargebackData.push(Number(chargebackResult._sum.amount || 0));
  }

  return {
    dates,
    payin: {
      success: payinSuccess,
      pending: payinPending,
      failed: payinFailed,
    },
    payout: {
      success: payoutSuccess,
      pending: payoutPending,
      failed: payoutFailed,
    },
    refund: refundData,
    chargeback: chargebackData,
  };
};

/**
 * 2. Payment Methods Chart
 */
const getPaymentMethods = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const whereClause = buildWhereClause(filters);

  const colorMap = {
    UPI: "#3b82f6",
    Cards: "#8b5cf6",
    "Net Banking": "#06b6d4",
    Wallets: "#f59e0b",
    "Bank Transfer": "#10b981",
    Other: "#94a3b8",
  };

  const result = [];

  // Get PAYIN payment methods
  const payinMethods = await prisma.payInRequest.groupBy({
    by: ["paymentMode"],
    where: {
      ...whereClause,
      status: "COMPLETED",
      requestedAt: { gte: startDate, lt: endDate },
    },
  });

  for (const method of payinMethods) {
    const total = await getTotalAmountInINR({
      ...whereClause,
      status: "COMPLETED",
      paymentMode: method.paymentMode,
      requestedAt: { gte: startDate, lt: endDate },
    });
    result.push({
      name: method.paymentMode || "Other",
      value: total,
      color: colorMap[method.paymentMode] || "#94a3b8",
      type: "payin",
    });
  }

  // Get PAYOUT payment methods
  const payoutMethods = await prisma.payOutRequest.groupBy({
    by: ["paymentMode"],
    where: {
      ...whereClause,
      status: "COMPLETED",
      requestedAt: { gte: startDate, lt: endDate },
    },
  });

  for (const method of payoutMethods) {
    const result2 = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "COMPLETED",
        paymentMode: method.paymentMode,
        requestedAt: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    });
    result.push({
      name: method.paymentMode || "Other",
      value: Number(result2._sum.amount || 0),
      color: colorMap[method.paymentMode] || "#94a3b8",
      type: "payout",
    });
  }

  return result;
};

/**
 * 3. Hourly Volume Chart (Histogram)
 */
const getHourlyVolume = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const whereClause = buildWhereClause(filters);

  const hours = getHoursArray(startDate, endDate);
  const payinSuccess = [];
  const payinPending = [];
  const payinFailed = [];
  const payoutSuccess = [];
  const payoutPending = [];
  const payoutFailed = [];
  const refundData = [];
  const chargebackData = [];

  for (const hour of hours) {
    const nextHour = new Date(hour);
    nextHour.setHours(nextHour.getHours() + 2);
    const label = hour.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });

    // Get PAYIN hourly volume
    const payinSuccessAmount = await getTotalAmountInINR({
      ...whereClause,
      status: "COMPLETED",
      requestedAt: { gte: hour, lt: nextHour },
    });
    payinSuccess.push(payinSuccessAmount);

    const payinPendingAmount = await getTotalAmountInINR({
      ...whereClause,
      status: "PENDING",
      requestedAt: { gte: hour, lt: nextHour },
    });
    payinPending.push(payinPendingAmount);

    const payinFailedAmount = await getTotalAmountInINR({
      ...whereClause,
      status: "FAILED",
      requestedAt: { gte: hour, lt: nextHour },
    });
    payinFailed.push(payinFailedAmount);

    // Get PAYOUT hourly volume
    const payoutSuccessResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "COMPLETED",
        requestedAt: { gte: hour, lt: nextHour },
      },
      _sum: { amount: true },
    });
    payoutSuccess.push(Number(payoutSuccessResult._sum.amount || 0));

    const payoutPendingResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "PENDING",
        requestedAt: { gte: hour, lt: nextHour },
      },
      _sum: { amount: true },
    });
    payoutPending.push(Number(payoutPendingResult._sum.amount || 0));

    const payoutFailedResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        status: "FAILED",
        requestedAt: { gte: hour, lt: nextHour },
      },
      _sum: { amount: true },
    });
    payoutFailed.push(Number(payoutFailedResult._sum.amount || 0));

    // Get REFUND hourly volume
    const refundWhere = {
      createdAt: { gte: hour, lt: nextHour },
      status: "COMPLETED",
      payInRequest: {
        merchantId: whereClause.merchantId || undefined,
        userId: whereClause.userId || undefined,
        gatewayId: whereClause.gatewayId || undefined,
      },
    };
    Object.keys(refundWhere.payInRequest).forEach(
      (key) =>
        refundWhere.payInRequest[key] === undefined &&
        delete refundWhere.payInRequest[key],
    );
    const refundResult = await prisma.refund.aggregate({
      where: refundWhere,
      _sum: { amount: true },
    });
    refundData.push(Number(refundResult._sum.amount || 0));

    // Get CHARGEBACK hourly volume
    const chargebackWhere = {
      initiatedAt: { gte: hour, lt: nextHour },
      status: "APPROVED",
      merchantId: whereClause.merchantId || undefined,
      gatewayId: whereClause.gatewayId || undefined,
    };
    Object.keys(chargebackWhere).forEach(
      (key) =>
        chargebackWhere[key] === undefined && delete chargebackWhere[key],
    );
    if (whereClause.userId) {
      chargebackWhere.payInRequest = { userId: whereClause.userId };
    }
    const chargebackResult = await prisma.chargeback.aggregate({
      where: chargebackWhere,
      _sum: { amount: true },
    });
    chargebackData.push(Number(chargebackResult._sum.amount || 0));
  }

  return {
    hours: hours.map((h) =>
      h.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
    ),
    payin: {
      success: payinSuccess,
      pending: payinPending,
      failed: payinFailed,
    },
    payout: {
      success: payoutSuccess,
      pending: payoutPending,
      failed: payoutFailed,
    },
    refund: refundData,
    chargeback: chargebackData,
  };
};

/**
 * 4. Gateway Performance Chart
 */
const getGatewayPerformance = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const whereClause = buildWhereClause(filters);

  // Get all gateways with PayIn, Payout, Refund, Chargeback
  const gatewayIds = await prisma.gateway.findMany({
    select: { id: true, name: true },
  });

  const result = [];

  for (const gateway of gatewayIds) {
    const gatewayId = gateway.id;

    // Get PAYIN total for this gateway
    const payinTotal = await getTotalAmountInINR({
      ...whereClause,
      gatewayId: gatewayId,
      status: "COMPLETED",
      requestedAt: { gte: startDate, lt: endDate },
    });

    // Get PAYOUT total for this gateway
    const payoutResult = await prisma.payOutRequest.aggregate({
      where: {
        ...whereClause,
        gatewayId: gatewayId,
        status: "COMPLETED",
        requestedAt: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    });
    const payoutTotal = Number(payoutResult._sum.amount || 0);

    // Get REFUND total for this gateway
    const refundWhere = {
      createdAt: { gte: startDate, lt: endDate },
      status: "COMPLETED",
      gatewayId: gatewayId,
      payInRequest: {
        merchantId: whereClause.merchantId || undefined,
        userId: whereClause.userId || undefined,
      },
    };
    Object.keys(refundWhere.payInRequest).forEach(
      (key) =>
        refundWhere.payInRequest[key] === undefined &&
        delete refundWhere.payInRequest[key],
    );
    const refundResult = await prisma.refund.aggregate({
      where: refundWhere,
      _sum: { amount: true },
    });
    const refundTotal = Number(refundResult._sum.amount || 0);

    // Get CHARGEBACK total for this gateway
    const chargebackWhere = {
      initiatedAt: { gte: startDate, lt: endDate },
      status: "APPROVED",
      gatewayId: gatewayId,
      merchantId: whereClause.merchantId || undefined,
    };
    Object.keys(chargebackWhere).forEach(
      (key) =>
        chargebackWhere[key] === undefined && delete chargebackWhere[key],
    );
    if (whereClause.userId) {
      chargebackWhere.payInRequest = { userId: whereClause.userId };
    }
    const chargebackResult = await prisma.chargeback.aggregate({
      where: chargebackWhere,
      _sum: { amount: true },
    });
    const chargebackTotal = Number(chargebackResult._sum.amount || 0);

    // Only include if any amount > 0
    if (
      payinTotal > 0 ||
      payoutTotal > 0 ||
      refundTotal > 0 ||
      chargebackTotal > 0
    ) {
      result.push({
        name: gateway.name || `Gateway ${gatewayId}`,
        payin: payinTotal,
        payout: payoutTotal,
        refund: refundTotal,
        chargeback: chargebackTotal,
      });
    }
  }

  // Sort by total volume and take top 5
  result.sort(
    (a, b) =>
      b.payin +
      b.payout +
      b.refund +
      b.chargeback -
      (a.payin + a.payout + a.refund + a.chargeback),
  );
  return result.slice(0, 5);
};

/**
 * 5. Transaction Composition Chart (Donut)
 */
const getTransactionComposition = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const whereClause = buildWhereClause(filters);

  // Get PayIn total
  const payinTotal = await getTotalAmountInINR({
    ...whereClause,
    status: "COMPLETED",
    requestedAt: { gte: startDate, lt: endDate },
  });

  // Get Payout total
  const payoutResult = await prisma.payOutRequest.aggregate({
    where: {
      ...whereClause,
      status: "COMPLETED",
      requestedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });
  const payoutTotal = Number(payoutResult._sum.amount || 0);

  // Get Refund amount
  const refundWhere = {
    createdAt: { gte: startDate, lt: endDate },
    status: "COMPLETED",
    payInRequest: {
      merchantId: whereClause.merchantId || undefined,
      userId: whereClause.userId || undefined,
      gatewayId: whereClause.gatewayId || undefined,
    },
  };

  // Remove undefined values
  Object.keys(refundWhere.payInRequest).forEach(
    (key) =>
      refundWhere.payInRequest[key] === undefined &&
      delete refundWhere.payInRequest[key],
  );

  const refundResult = await prisma.refund.aggregate({
    where: refundWhere,
    _sum: { amount: true },
  });
  const refundTotal = Number(refundResult._sum.amount || 0);

  // Get Chargeback amount
  const chargebackWhere = {
    initiatedAt: { gte: startDate, lt: endDate },
    status: "APPROVED",
    merchantId: whereClause.merchantId || undefined,
    gatewayId: whereClause.gatewayId || undefined,
  };

  // Remove undefined values
  Object.keys(chargebackWhere).forEach(
    (key) => chargebackWhere[key] === undefined && delete chargebackWhere[key],
  );

  // Add userId filter through payInRequest relation
  if (whereClause.userId) {
    chargebackWhere.payInRequest = {
      userId: whereClause.userId,
    };
  }

  const chargebackResult = await prisma.chargeback.aggregate({
    where: chargebackWhere,
    _sum: { amount: true },
  });
  const chargebackTotal = Number(chargebackResult._sum.amount || 0);

  const total = payinTotal + payoutTotal + refundTotal + chargebackTotal;

  return {
    payin: payinTotal,
    payout: payoutTotal,
    refund: refundTotal,
    chargeback: chargebackTotal,
    total,
  };
};

/**
 * 6. Merchant Performance Chart
 */
const getMerchantPerformance = async (filters) => {
  const { startDate, endDate } = getDateRange(filters);
  const whereClause = buildWhereClause(filters);

  // Get PAYIN - top merchants by volume
  const payinResults = await prisma.payInRequest.groupBy({
    by: ["merchantId"],
    where: {
      ...whereClause,
      status: "COMPLETED",
      requestedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  if (payinResults.length === 0) {
    return [];
  }

  const merchantIds = payinResults.map((r) => r.merchantId);

  // Get PAYOUT
  const payoutResults = await prisma.payOutRequest.groupBy({
    by: ["merchantId"],
    where: {
      ...whereClause,
      merchantId: { in: merchantIds },
      status: "COMPLETED",
      requestedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });

  // Get REFUND
  const refundResults = await prisma.refund.groupBy({
    by: ["merchantId"],
    where: {
      merchantId: { in: merchantIds },
      status: "COMPLETED",
      createdAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });

  // Get CHARGEBACK
  const chargebackResults = await prisma.chargeback.groupBy({
    by: ["merchantId"],
    where: {
      merchantId: { in: merchantIds },
      status: "APPROVED",
      initiatedAt: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });

  // Create maps
  const payoutMap = {};
  payoutResults.forEach((r) => {
    payoutMap[r.merchantId] = Number(r._sum.amount || 0);
  });

  const refundMap = {};
  refundResults.forEach((r) => {
    refundMap[r.merchantId] = Number(r._sum.amount || 0);
  });

  const chargebackMap = {};
  chargebackResults.forEach((r) => {
    chargebackMap[r.merchantId] = Number(r._sum.amount || 0);
  });

  // Get merchant names
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true, name: true },
  });

  const merchantMap = {};
  merchants.forEach((m) => {
    merchantMap[m.id] = m.name;
  });

  // Build result
  const result = payinResults.map((r) => {
    const mid = r.merchantId;
    return {
      name: merchantMap[mid] || `Merchant ${mid}`,
      payin: Number(r._sum.amount || 0),
      payout: payoutMap[mid] || 0,
      refund: refundMap[mid] || 0,
      chargeback: chargebackMap[mid] || 0,
    };
  });

  // Sort by total and take top 5
  result.sort(
    (a, b) =>
      b.payin +
      b.payout +
      b.refund +
      b.chargeback -
      (a.payin + a.payout + a.refund + a.chargeback),
  );

  return result.slice(0, 5);
};

module.exports = {
  getTransactionVolume,
  getPaymentMethods,
  getHourlyVolume,
  getGatewayPerformance,
  getTransactionComposition,
  getMerchantPerformance,
};
