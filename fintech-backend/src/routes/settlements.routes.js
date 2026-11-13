const express = require("express");
const router = express.Router();
const settlementController = require("../controllers/settlements/settlements.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

// All settlement routes require authentication
router.use(authMiddleware);

// Merchant settlement summary
router.get(
  "/summary/merchant/:merchantId",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.getMerchantSettlementSummary,
);

// Export route MUST be before :id routes
router.get(
  "/download",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.exportSettlements,
);

// Summary route
router.get(
  "/summary",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.getSettlementSummary,
);

// Manual settlement routes must be BEFORE :id routes
router.post(
  "/manual-settlement/credit",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.manualCreditPayout,
);

router.post(
  "/manual-settlement/debit",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.manualDebitPayIn,
);

// Main CRUD routes - :id routes should come AFTER specific routes
router.get(
  "/",
  authorize(["SUPER_ADMIN", "ADMIN", "USER"]),
  settlementController.getSettlements,
);

router.get(
  "/:id",
  authorize(["SUPER_ADMIN", "ADMIN", "USER"]),
  settlementController.getSettlementById,
);

// Allow MERCHANT to create settlements too
router.post(
  "/",
  authorize(["SUPER_ADMIN", "ADMIN", "USER"]),
  settlementController.createSettlement,
);

router.put(
  "/:id/approve",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.approveSettlement,
);

router.put(
  "/:id/reject",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.rejectSettlement,
);

router.put(
  "/:id/process",
  authorize(["SUPER_ADMIN", "ADMIN"]),
  settlementController.processSettlement,
);

module.exports = router;
