const express = require("express");
const router = express.Router();
const merchantsController = require("../controllers/merchants/merchants.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);
router.get("/", merchantsController.getAllMerchants);
router.use(authorize("SUPER_ADMIN", "ADMIN"));

router.post("/", merchantsController.createMerchant);
router.put("/:id/approve", merchantsController.approveMerchant);
router.put("/:id/reject", merchantsController.rejectMerchant);
router.get("/stats", merchantsController.getMerchantStats);
router.get(
  "/webhook-config/options",
  merchantsController.getWebhookFormatOptions,
);
router.post(
  "/webhook-config/preview",
  merchantsController.previewWebhookConfig,
);
router.post("/assign-user", merchantsController.assignUserToMerchant);
router.delete(
  "/:merchantId/users/:userId",
  merchantsController.removeUserFromMerchant,
);
router.get("/merchant-summary/:id", merchantsController.getMerchantSummary);
router.get("/:id", merchantsController.getMerchantById);
router.put("/:id", merchantsController.updateMerchant);
router.delete("/:id", merchantsController.deleteMerchant);
router.get("/:id/whitelist-ips", merchantsController.getWhitelistedIps);
router.post("/:id/whitelist-ips", merchantsController.addIpToWhitelist);
router.put("/:id/whitelist-ips/:ip", merchantsController.updateIpInWhitelist);
router.delete(
  "/:id/whitelist-ips/:ip",
  merchantsController.deleteIpFromWhitelist,
);

router.get("/:id/webhook-config", merchantsController.getWebhookConfig);
router.put("/:id/webhook-config", merchantsController.updateWebhookConfig);

module.exports = router;
