const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");

// ============ Analytics Data Converter ============
function convertAnalyticsData(data, rate) {
  if (!data) return data;

  // Transaction Volume & Hourly Volume
  if ((data.dates || data.hours) && data.payin && data.payout) {
    ["payin", "payout"].forEach((type) => {
      if (data[type]) {
        ["success", "pending", "failed"].forEach((status) => {
          if (Array.isArray(data[type][status])) {
            data[type][status] = data[type][status].map((val) =>
              val !== 0 ? Number((Number(val) / rate).toFixed(2)) : 0,
            );
          }
        });
      }
    });

    if (Array.isArray(data.refund)) {
      data.refund = data.refund.map((val) =>
        val !== 0 ? Number((Number(val) / rate).toFixed(2)) : 0,
      );
    }
    if (Array.isArray(data.chargeback)) {
      data.chargeback = data.chargeback.map((val) =>
        val !== 0 ? Number((Number(val) / rate).toFixed(2)) : 0,
      );
    }
    return data;
  }

  // Payment Methods
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0].value !== undefined &&
    data[0].type !== undefined
  ) {
    return data.map((item) => ({
      ...item,
      value: Number((Number(item.value) / rate).toFixed(2)),
    }));
  }

  // Gateway / Merchant Performance
  if (Array.isArray(data) && data.length > 0 && data[0].payin !== undefined) {
    return data.map((item) => ({
      ...item,
      payin: Number((Number(item.payin) / rate).toFixed(2)),
      payout: Number((Number(item.payout) / rate).toFixed(2)),
      refund: Number((Number(item.refund) / rate).toFixed(2)),
      chargeback: Number((Number(item.chargeback) / rate).toFixed(2)),
    }));
  }

  // Transaction Composition
  if (data.payin !== undefined && data.total !== undefined) {
    data.payin = Number((Number(data.payin) / rate).toFixed(2));
    data.payout = Number((Number(data.payout) / rate).toFixed(2));
    data.refund = Number((Number(data.refund) / rate).toFixed(2));
    data.chargeback = Number((Number(data.chargeback) / rate).toFixed(2));
    data.total = Number((Number(data.total) / rate).toFixed(2));
    return data;
  }

  return data;
}

// ============ Helper: Check if data is analytics ============
function isAnalyticsData(data) {
  if (!data) return false;

  // Transaction Volume / Hourly Volume
  if ((data.dates || data.hours) && data.payin && data.payout) return true;

  // Payment Methods
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0].value !== undefined &&
    data[0].type !== undefined
  )
    return true;

  // Gateway / Merchant Performance
  if (Array.isArray(data) && data.length > 0 && data[0].payin !== undefined)
    return true;

  // Transaction Composition
  if (data.payin !== undefined && data.total !== undefined) return true;

  return false;
}

// Keep currency rates in memory for 5 minutes (saves one DB query per request)
let ratesCache = { rates: null, expiresAt: 0 };
const RATES_TTL_MS = 5 * 60 * 1000;

const getRates = async () => {
  const nowMs = Date.now();
  if (ratesCache.rates && nowMs < ratesCache.expiresAt) {
    return ratesCache.rates;
  }
  const rates = await prisma.currencyRate.findMany({
    where: {
      quoteCurrency: "INR",
      validFrom: { lte: new Date() },
    },
  });
  ratesCache = { rates, expiresAt: nowMs + RATES_TTL_MS };
  return rates;
};

// ============ MAIN MIDDLEWARE ============
const currencyMiddleware = async (req, res, next) => {
  try {
    let userCurrency = "INR";

    if (req.user && req.user.defaultCurrency) {
      userCurrency = req.user.defaultCurrency;
    } else if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.defaultCurrency) {
          userCurrency = decoded.defaultCurrency;
        }
      } catch (err) {}
    }

    const requestedCurrency = req.query.currency || userCurrency;
    req.userCurrency = requestedCurrency;

    const rates = await getRates();

    req.rates = rates;

    const originalJson = res.json;
    res.json = function (data) {
      if (
        req.method === "GET" &&
        data &&
        data.success !== false &&
        requestedCurrency !== "INR"
      ) {
        const rateEntry = rates.find(
          (r) => r.baseCurrency === requestedCurrency,
        );

        if (rateEntry) {
          const rate = Number(rateEntry.rate);

          // ============ Check for Analytics Data ============
          if (data.data && isAnalyticsData(data.data)) {
            data.data = convertAnalyticsData(data.data, rate);
            data.currency = requestedCurrency;
            data.convertedAt = new Date().toISOString();
            originalJson.call(this, data);
            return;
          }

          // ============ Dashboard/Regular Data ============
          const fieldsToConvert = [
            "amount",
            "amountToCredit",
            "feeAmount",
            "taxAmount",
            "platformProfit",
            "totalVolume",
            "amountInINR",
            "requestedAmount",
            "finalAmount",
            "profit",
            "amountToDebit",
            "gatewayAmount",
            "closingBalance",
            "openingBalance",
            "currentBalance",
            "availableBalance",
            "totalInToday",
            "totalInThisWeek",
            "totalInThisMonth",
            "totalInThisYear",
            "netChargesToday",
            "netChargesThisWeek",
            "netChargesThisMonth",
            "netChargesThisYear",
            "payoutBalance",
            "payoutWalletBalance",
            "unsettledAmount",
            "balance",
            "sourceWalletBalanceBefore",
            "sourceWalletBalanceAfter",
            "destinationWalletBalanceBefore",
            "destinationWalletBalanceAfter",
            "refundAmount",
            "chargebackAmount",
            "todayPayIn",
            "averagePayIn",
            "todayPayout",
            "averagePayout",
            "pendingSettlements",
            "total",
            "value",
            "failedAmount",
            "totalTransactionValue",
            "totalCharges",
            "todayVolume",
            "transactions",
            "successRate",
          ];

          if (data.data && data.data.stats) {
            const statsFields = [
              "currentBalance",
              "todayPayIn",
              "averagePayIn",
              "chargebackAmount",
              "refundAmount",
              "payoutWalletBalance",
              "todayPayout",
              "averagePayout",
              "pendingSettlements",
              "failedAmount",
              "todayVolume",
              "transactions",
              "successRate",
            ];

            const stats = data.data.stats;
            statsFields.forEach((field) => {
              if (stats[field] !== undefined && stats[field] !== null) {
                const numValue = Number(stats[field]);
                if (!isNaN(numValue) && numValue !== 0) {
                  stats[field] = Number((numValue / rate).toFixed(2));
                }
              }
            });

            data.currency = requestedCurrency;
            data.convertedAt = new Date().toISOString();
            originalJson.call(this, data);
            return;
          }

          // Regular array/object conversion
          if (data.data && Array.isArray(data.data)) {
            data.data = data.data.map((item) =>
              convertObjectFields(item, fieldsToConvert, rate),
            );
          } else if (data.data && typeof data.data === "object") {
            data.data = convertObjectFields(data.data, fieldsToConvert, rate);
          }

          if (data.data) {
            data.currency = requestedCurrency;
            data.convertedAt = new Date().toISOString();
          }
        }
      } else if (data.data && requestedCurrency === "INR") {
        data.currency = "INR";
      }

      originalJson.call(this, data);
    };

    next();
  } catch (error) {
    next();
  }
};

// Helper function
function convertObjectFields(obj, fields, rate) {
  if (!obj || typeof obj !== "object") return obj;

  const converted = { ...obj };

  fields.forEach((field) => {
    if (converted[field] !== undefined && converted[field] !== null) {
      const numValue = Number(converted[field]);
      if (!isNaN(numValue) && numValue !== 0) {
        converted[field] = Number((numValue / rate).toFixed(2));
      }
    }
  });

  return converted;
}

module.exports = currencyMiddleware;
