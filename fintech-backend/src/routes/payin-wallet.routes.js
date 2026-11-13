const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const payinWalletController = require("../controllers/payin-wallet/payin-wallet.controller");

// Apply authMiddleware to ALL routes
router.use(authMiddleware);

// Get wallet transactions with filters and pagination
router.get(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinWalletController.getWalletTransactions.bind(payinWalletController),
);

// Get wallet summary
router.get(
  "/summaries",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinWalletController.getWalletSummary.bind(payinWalletController),
);

// Export to CSV
router.get(
  "/export/csv",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payinWalletController.exportTransactionsToCSV.bind(payinWalletController),
);

// Get single transaction by ID
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinWalletController.getWalletTransactionById.bind(payinWalletController),
);

// Get merchant specific transactions (Admin only)
router.get(
  "/merchant/:merchantId",
  authorize("ADMIN", "SUPER_ADMIN"),
  payinWalletController.getMerchantTransactions.bind(payinWalletController),
);

// Create new transaction (admin only)
router.post(
  "/",
  authorize("ADMIN", "SUPER_ADMIN"),
  payinWalletController.createWalletTransaction.bind(payinWalletController),
);

module.exports = router;
