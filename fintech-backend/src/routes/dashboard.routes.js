const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard/dashboard.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// Apply authentication middleware
router.use(authMiddleware);

// Stats endpoint for dashboard
router.get(
  "/stats",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  dashboardController.getStats,
);

router.get(
  "/recent-transactions",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  dashboardController.getRecentTransactions,
);

module.exports = router;
