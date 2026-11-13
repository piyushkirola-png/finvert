const express = require("express");
const router = express.Router();
const csvExportController = require("../controllers/csv-export/csv-export.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// All routes require authentication
router.use(authMiddleware);

// Get all exports for current user
router.get(
  "/exports",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.getMyExports,
);

// Request exports by type
router.get(
  "/payin-requests",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestPayInRequestsExport,
);

router.get(
  "/payout-requests",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestPayOutRequestsExport,
);

router.get(
  "/payin-wallets",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestPayInWalletsExport,
);

router.get(
  "/payout-wallets",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestPayOutWalletsExport,
);

router.get(
  "/settlements",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestSettlementsExport,
);

router.get(
  "/chargebacks",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestChargebacksExport,
);

router.get(
  "/refunds",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.requestRefundsExport,
);

// Download completed export
router.get(
  "/download/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  csvExportController.downloadExport,
);

module.exports = router;
