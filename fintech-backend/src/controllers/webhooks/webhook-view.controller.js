const webhookViewService = require("./webhook-view.service");

// GET ALL INBOUND WEBHOOKS
const getInboundWebhooks = async (req, res) => {
  try {
    const data = await webhookViewService.getInboundWebhooks(req.query);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get inbound webhooks error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET SINGLE INBOUND WEBHOOK BY ID
const getInboundWebhookById = async (req, res) => {
  try {
    const data = await webhookViewService.getInboundWebhookById(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Inbound webhook not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get inbound webhook by id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL OUTBOUND WEBHOOKS
const getOutboundWebhooks = async (req, res) => {
  try {
    const data = await webhookViewService.getOutboundWebhooks(req.query);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get outbound webhooks error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET SINGLE OUTBOUND WEBHOOK BY ID
const getOutboundWebhookById = async (req, res) => {
  try {
    const data = await webhookViewService.getOutboundWebhookById(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Outbound webhook not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get outbound webhook by id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// RETRY FAILED OUTBOUND WEBHOOK
const retryOutboundWebhook = async (req, res) => {
  try {
    const data = await webhookViewService.retryOutboundWebhook(req.params.id);
    res.json({ success: true, data, message: "Webhook retry initiated" });
  } catch (err) {
    console.error("Retry outbound webhook error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getInboundWebhooks,
  getInboundWebhookById,
  getOutboundWebhooks,
  getOutboundWebhookById,
  retryOutboundWebhook,
};
