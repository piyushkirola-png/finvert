const express = require("express");
const router = express.Router();
const payInWalletSummariesController = require("../controllers/payin-wallet-summaries/payin-wallet-summaries.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// Get all wallet summaries (Admin sees all, Merchant sees own)
router.get(
  "/",
  authMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.findAll,
);

// Get specific merchant wallet summary (Admin only)
router.get(
  "/merchant/:merchantId",
  authMiddleware,
  authorize("ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.findOne,
);

// Refresh wallet summary (Admin only)
router.post(
  "/merchant/:merchantId/refresh",
  authMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.refreshSummary,
);

// Refresh all merchants Summaries
router.post(
  "/refresh-all",
  authMiddleware,
  authorize("ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.refreshAllSummaries,
);

module.exports = router;
