const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics/analytics.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// Apply authentication middleware
router.use(authMiddleware);

// Transaction volume chart
router.get(
  "/transaction-volume",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getTransactionVolume,
);

// Payment methods chart
router.get(
  "/payment-methods",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getPaymentMethods,
);

// Hourly volume chart
router.get(
  "/hourly-volume",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getHourlyVolume,
);

// Gateway performance chart
router.get(
  "/gateway-performance",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getGatewayPerformance,
);

// Transaction composition chart (PayIn, Payout, Refund, Chargeback)
router.get(
  "/transaction-composition",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getTransactionComposition,
);

// Merchant performance chart
router.get(
  "/merchant-performance",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getMerchantPerformance,
);

module.exports = router;
