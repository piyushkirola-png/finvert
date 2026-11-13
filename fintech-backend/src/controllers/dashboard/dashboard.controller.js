const dashboardService = require("./dashboard.service");

/**
 * Helper: Build filters with user context
 */
const buildFilters = (req) => {
  const filters = {
    merchantId: req.query.merchantId,
    gatewayId: req.query.gatewayId,
    userId: req.query.userId,
    dateRange: req.query.dateRange,
    customStartDate: req.query.customStartDate,
    customEndDate: req.query.customEndDate,
  };

  // If user is USER, scope to their merchant + userId
  if (req.user && req.user.role === "USER") {
    filters.merchantId = req.user.merchantId;
    filters.userId = req.user.id;
  }

  return filters;
};

/**
 * GET /api/dashboard/stats
 */
const getStats = async (req, res) => {
  try {
    const filters = buildFilters(req);

    const stats = await dashboardService.getStats(filters);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error in getStats controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stats",
    });
  }
};

/**
 * GET /api/dashboard/recent-transactions
 */
const getRecentTransactions = async (req, res) => {
  try {
    const filters = buildFilters(req);

    const transactions = await dashboardService.getRecentTransactions(filters);

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error in getRecentTransactions controller:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recent transactions",
    });
  }
};

// Update exports
module.exports = {
  getStats,
  getRecentTransactions,
};
