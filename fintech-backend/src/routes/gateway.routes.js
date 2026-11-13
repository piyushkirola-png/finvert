const express = require("express");
const router = express.Router();
const gatewayController = require("../controllers/gateway/gateway.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// Add authentication and admin authorization
router.use(authMiddleware);
router.use(authorize("SUPER_ADMIN", "ADMIN"));

router.post("/", gatewayController.createGateway);
router.get("/", gatewayController.getAllGateways);
router.get("/:id", gatewayController.getGatewayById);
router.put("/:id", gatewayController.updateGateway);
router.delete("/:id", gatewayController.deleteGateway);

module.exports = router;
