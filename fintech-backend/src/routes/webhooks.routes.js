const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhooks/webhook.controller");
const webhookViewController = require("../controllers/webhooks/webhook-view.controller");

router.get("/inbound", webhookViewController.getInboundWebhooks);
router.get("/inbound/:id", webhookViewController.getInboundWebhookById);
router.get("/outbound", webhookViewController.getOutboundWebhooks);
router.get("/outbound/:id", webhookViewController.getOutboundWebhookById);
router.post("/outbound/:id/retry", webhookViewController.retryOutboundWebhook);
router.get("/logs", webhookController.getLogs);
router.post("/:gatewayName", webhookController.handleWebhook);

module.exports = router;
