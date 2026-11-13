const express = require("express");
const router = express.Router();
const payoutRequestsController = require("../controllers/payout-requests/payout-requests.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const hmacSignatureMiddleware = require("../middleware/hmac-signature.middleware");
const {
  createPayoutRequestValidation,
  updatePayoutRequestValidation,
  getPayoutRequestValidation,
  getPayoutRequestsValidation,
} = require("../controllers/payout-requests/payout-requests.validation");

router.use(authMiddleware);

router.post(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  hmacSignatureMiddleware,
  createPayoutRequestValidation,
  payoutRequestsController.create,
);

router.get(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getPayoutRequestsValidation,
  payoutRequestsController.findAll,
);

router.get(
  "/stats",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutRequestsController.getDashboardStats,
);

router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getPayoutRequestValidation,
  payoutRequestsController.findOne,
);

router.patch(
  "/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  updatePayoutRequestValidation,
  payoutRequestsController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  payoutRequestsController.remove,
);

router.post(
  "/:id/retry",
  authorize("ADMIN", "SUPER_ADMIN"),
  payoutRequestsController.retry,
);

router.get(
  "/export/csv",
  authMiddleware,
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payoutRequestsController.exportCSV,
);

module.exports = router;
