const express = require("express");
const router = express.Router();
const chargebacksController = require("../controllers/chargebacks/chargebacks.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  initiateChargebackValidation,
  updateChargebackStatusValidation,
  respondToChargebackValidation,
  resolveDisputeValidation,
  reverseChargebackValidation,
  getChargebackValidation,
  getChargebacksValidation,
} = require("../controllers/chargebacks/chargebacks.validation");

// AUTHORIZATION MIDDLEWARE
const forceMerchantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No user found",
    });
  }

  const allowedRoles = ["USER", "ADMIN", "SUPER_ADMIN"];
  const userRole = req.user.role;

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: ${userRole} role does not have access. Required roles: ${allowedRoles.join(", ")}`,
    });
  }

  next();
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// ----- GET /stats - Get statistics -----
router.get(
  "/stats",
  forceMerchantAccess,
  chargebacksController.getChargebackStats,
);

// ----- GET /export/csv - Export to CSV -----
router.get(
  "/export/csv",
  forceMerchantAccess,
  chargebacksController.exportChargebacksCSV,
);

// ----- POST / - Initiate chargeback -----
router.post(
  "/",
  forceMerchantAccess,
  initiateChargebackValidation,
  chargebacksController.initiateChargeback,
);

// ----- GET / - Get all chargebacks -----
router.get(
  "/",
  forceMerchantAccess,
  getChargebacksValidation,
  chargebacksController.getAllChargebacks,
);

// ----- GET /:id - Get single chargeback (DYNAMIC - Goes LAST) -----
router.get(
  "/:id",
  forceMerchantAccess,
  getChargebackValidation,
  chargebacksController.getChargebackById,
);

// ----- PATCH /:id/status - Admin only -----
router.patch(
  "/:id/status",
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role} role does not have access. Required roles: ADMIN, SUPER_ADMIN`,
      });
    }
    next();
  },
  updateChargebackStatusValidation,
  chargebacksController.updateChargebackStatus,
);

// ----- POST /:id/respond - Respond to dispute (MERCHANT allowed) -----
router.post(
  "/:id/respond",
  forceMerchantAccess,
  respondToChargebackValidation,
  chargebacksController.respondToChargeback,
);

// ----- POST /:id/resolve - Admin only -----
router.post(
  "/:id/resolve",
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role} role does not have access. Required roles: ADMIN, SUPER_ADMIN`,
      });
    }
    next();
  },
  resolveDisputeValidation,
  chargebacksController.resolveDispute,
);

// ----- POST /:id/reverse - Admin only -----
router.post(
  "/:id/reverse",
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role} role does not have access. Required roles: ADMIN, SUPER_ADMIN`,
      });
    }
    next();
  },
  reverseChargebackValidation,
  chargebacksController.reverseChargeback,
);

module.exports = router;
