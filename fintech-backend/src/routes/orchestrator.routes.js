const express = require("express");
const router = express.Router();
const orchestratorController = require("../controllers/payin-requests/Orchestrator/orchestrator.controller");
const {
  authMiddleware: authenticate,
} = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

// All routes require authentication
router.use(authenticate);

/**
 * Configuration Routes
 */

// Configure merchant routing strategy
router.post(
  "/configure/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.configureRouting(req, res),
);

// Set gateway priorities for merchant (Priority Routing)
router.post(
  "/priorities/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.setGatewayPriorities(req, res),
);

// Configure load balancing weights
router.post(
  "/load-balance/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.configureLoadBalancing(req, res),
);

// Configure payment mode preferences
router.post(
  "/payment-modes/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.configurePaymentModes(req, res),
);

/**
 * Read/Query Routes
 */

// Get merchant routing preferences
router.get(
  "/preferences/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getRoutingPreferences(req, res),
);

// Get single gateway health metrics
router.get(
  "/health/:gatewayId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getGatewayHealth(req, res),
);

// Get all gateways health metrics
router.get("/health", authorize("USER", "ADMIN", "SUPER_ADMIN"), (req, res) =>
  orchestratorController.getAllGatewayHealth(req, res),
);

// Get failure logs for debugging
router.get(
  "/failures/:payInRequestId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getFailureLogs(req, res),
);

// Get routing analytics/dashboard
router.get(
  "/analytics",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getAnalytics(req, res),
);

module.exports = router;
