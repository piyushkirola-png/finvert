const express = require("express");
const router = express.Router();
const payoutWalletSummaryController = require("../controllers/payout-wallet-summaries/payout-wallet-summaries.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);

router.get(
  "/",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payoutWalletSummaryController.getAllSummaries,
);

router.get(
  "/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutWalletSummaryController.getSummary,
);

router.post(
  "/:merchantId/refresh",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payoutWalletSummaryController.refreshSummary,
);

router.post(
  "/refresh-all",
  authorize("ADMIN", "SUPER_ADMIN"),
  payoutWalletSummaryController.refreshAll,
);

module.exports = router;
