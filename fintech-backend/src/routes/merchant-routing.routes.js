const express = require("express");
const router = express.Router();
const merchantRoutingController = require("../controllers/merchant-routing/merchant-routing.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// Apply authentication and admin authorization
router.use(authMiddleware);
router.use(authorize("SUPER_ADMIN", "ADMIN"));

// Merchant Routing Routes
router.post("/", merchantRoutingController.createMerchantRouting);
router.get("/", merchantRoutingController.getAllMerchantRouting);
router.get("/:id", merchantRoutingController.getMerchantRoutingById);
router.get(
  "/merchant/:merchantId",
  merchantRoutingController.getMerchantRoutingByMerchant,
);
router.put("/:id", merchantRoutingController.updateMerchantRouting);
router.delete("/:id", merchantRoutingController.deleteMerchantRouting);

module.exports = router;
