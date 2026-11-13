const analyticsService = require("./analytics.service");

/**
 * Helper: Build filters with user context
 */
const buildFilters = (req) => {
  const filters = {
    merchantId: req.query.merchantId,
    gatewayId: req.query.gatewayId,
    userId: req.query.userId,
    dateRange: req.query.dateRange || "today",
    customStartDate: req.query.customStartDate,
    customEndDate: req.query.customEndDate,
  };

  // If user is MERCHANT, scope to their merchant + userId
  if (req.user && req.user.role === "USER") {
    filters.merchantId = req.user.merchantId;
    filters.userId = req.user.id;
  }

  return filters;
};

/**
 * GET /api/analytics/transaction-volume
 */
const getTransactionVolume = async (req, res) => {
  try {
    const filters = buildFilters(req);
    const data = await analyticsService.getTransactionVolume(filters);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getTransactionVolume:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction volume",
    });
  }
};

/**
 * GET /api/analytics/payment-methods
 */
const getPaymentMethods = async (req, res) => {
  try {
    const filters = buildFilters(req);
    const data = await analyticsService.getPaymentMethods(filters);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getPaymentMethods:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payment methods",
    });
  }
};

/**
 * GET /api/analytics/hourly-volume
 */
const getHourlyVolume = async (req, res) => {
  try {
    const filters = buildFilters(req);
    const data = await analyticsService.getHourlyVolume(filters);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getHourlyVolume:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch hourly volume",
    });
  }
};

/**
 * GET /api/analytics/gateway-performance
 */
const getGatewayPerformance = async (req, res) => {
  try {
    const filters = buildFilters(req);
    const data = await analyticsService.getGatewayPerformance(filters);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getGatewayPerformance:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch gateway performance",
    });
  }
};

/**
 * GET /api/analytics/transaction-composition
 */
const getTransactionComposition = async (req, res) => {
  try {
    const filters = buildFilters(req);
    const data = await analyticsService.getTransactionComposition(filters);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getTransactionComposition:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction composition",
    });
  }
};

/**
 * GET /api/analytics/merchant-performance
 */
const getMerchantPerformance = async (req, res) => {
  try {
    const filters = buildFilters(req);
    const data = await analyticsService.getMerchantPerformance(filters);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getMerchantPerformance:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch merchant performance",
    });
  }
};

module.exports = {
  getTransactionVolume,
  getPaymentMethods,
  getHourlyVolume,
  getGatewayPerformance,
  getTransactionComposition,
  getMerchantPerformance,
};
