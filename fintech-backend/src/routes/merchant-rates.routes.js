const express = require("express");
const router = express.Router();
const merchantRatesController = require("../controllers/merchant-rates/merchant-rates.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);
router.use(authorize("SUPER_ADMIN", "ADMIN"));

router.get("/:merchantId", merchantRatesController.getMerchantRates);
router.post("/", merchantRatesController.createMerchantRate);
router.put("/:id", merchantRatesController.updateMerchantRate);
router.delete("/:id", merchantRatesController.deleteMerchantRate);

module.exports = router;
