const express = require("express");
const router = express.Router();
const payInRequestsController = require("../controllers/payin-requests/payin-requests.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  ipWhitelistMiddleware,
} = require("../middleware/ip-whitelist.middleware");
const { authorize } = require("../middleware/roles.middleware");
const hmacSignatureMiddleware = require("../middleware/hmac-signature.middleware");
const {
  createPayInRequestValidation,
  updatePayInRequestValidation,
  getPayInRequestValidation,
} = require("../controllers/payin-requests/payin-requests.validation");

router.use(authMiddleware);

router.post(
  "/",
  ipWhitelistMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  hmacSignatureMiddleware,
  createPayInRequestValidation,
  payInRequestsController.create,
);

router.get(
  "/reference/:merchantReference",
  ipWhitelistMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInRequestsController.findByMerchantReference,
);

router.get(
  "/",
  ipWhitelistMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInRequestsController.findAll,
);

router.get(
  "/stats",
  ipWhitelistMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInRequestsController.getDashboardStats,
);

router.get(
  "/:id",
  ipWhitelistMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getPayInRequestValidation,
  payInRequestsController.findOne,
);

router.patch(
  "/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  updatePayInRequestValidation,
  payInRequestsController.update,
);

router.delete(
  "/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  payInRequestsController.remove,
);

router.get(
  "/stats/summary",
  authorize("ADMIN", "SUPER_ADMIN"),
  payInRequestsController.getStats,
);

router.post(
  "/:id/retry",
  authorize("ADMIN", "SUPER_ADMIN"),
  payInRequestsController.retry,
);

router.get(
  "/export/csv",
  ipWhitelistMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInRequestsController.exportCSV,
);

module.exports = router;
