const express = require("express");
const router = express.Router();
const refundsController = require("../controllers/refunds/refunds.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const {
  initiateRefundValidation,
  updateRefundStatusValidation,
  cancelRefundValidation,
  getRefundValidation,
  getRefundsValidation,
} = require("../controllers/refunds/refunds.validation");

router.use(authMiddleware);

// ----- GET /stats - Merchant can view own stats, Admin sees all -----
router.get(
  "/stats",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  refundsController.getRefundStats,
);

// ----- GET / - Get all refunds (Merchant sees own, Admin sees all) -----
router.get(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getRefundsValidation,
  refundsController.getAllRefunds,
);

// ----- GET /:id - Get single refund (Merchant sees own, Admin sees all) -----
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getRefundValidation,
  refundsController.getRefundById,
);

// ADMIN ONLY

// ----- POST / - Initiate refund (Admin only) -----
router.post(
  "/",
  authorize("ADMIN", "SUPER_ADMIN"),
  initiateRefundValidation,
  refundsController.initiateRefund,
);

// ----- PATCH /:id/status - Update refund status (Admin only) -----
router.patch(
  "/:id/status",
  authorize("ADMIN", "SUPER_ADMIN"),
  updateRefundStatusValidation,
  refundsController.updateRefundStatus,
);

// ----- POST /:id/cancel - Cancel refund (Admin only) -----
router.post(
  "/:id/cancel",
  authorize("ADMIN", "SUPER_ADMIN"),
  cancelRefundValidation,
  refundsController.cancelRefund,
);

// ----- GET /export/csv - Export refunds (Merchant sees own, Admin sees all) -----
router.get(
  "/export/csv",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  refundsController.exportRefundsCSV,
);

module.exports = router;
