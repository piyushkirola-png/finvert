const express = require("express");
const router = express.Router();
const payoutWalletController = require("../controllers/payout-wallet/payout-wallet.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);

// Root route
router.get(
  "/admin/merchant-balances",
  authorize("ADMIN", "SUPER_ADMIN"),
  payoutWalletController.getAllMerchantBalances,
);

router.get(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutWalletController.getWalletTransactions,
);

router.get(
  "/transactions",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutWalletController.getWalletTransactions,
);

router.get(
  "/summary",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutWalletController.getWalletSummary,
);

router.get(
  "/export/csv",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payoutWalletController.exportTransactionsToCSV,
);

router.get(
  "/transactions/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutWalletController.getWalletTransactionById,
);

router.get(
  "/merchant/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutWalletController.getMerchantTransactions,
);

router.post(
  "/transactions",
  authorize("ADMIN", "SUPER_ADMIN"),
  payoutWalletController.createWalletTransaction,
);

module.exports = router;
