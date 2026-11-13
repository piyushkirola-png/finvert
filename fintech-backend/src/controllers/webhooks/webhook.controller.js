const webhookService = require("./webhook.service");

class WebhookController {
  /**
   * Webhook receiver
   */
  async handleWebhook(req, res) {
    const gatewayName = req.params.gatewayName;
    const payload = req.body;
    const headers = req.headers;

    try {
      const result = await webhookService.processWebhook(
        gatewayName,
        payload,
        headers,
      );

      // Check if processing failed due to validation
      if (result.success === false) {
        console.error(
          `[Webhook Controller] Processing failed: ${result.error}`,
        );
        return res.status(400).json({
          status: "error",
          message: result.error || "Webhook processing failed",
          failureCode: result.failureCode || "PROCESSING_ERROR",
        });
      }

      // Always return 200 OK to acknowledge receipt
      res.status(200).json({
        status: "success",
        message: "Webhook received and processed",
      });
    } catch (error) {
      console.error(`Webhook processing error for ${gatewayName}:`, error);
      // Still return 200 to avoid gateway resending
      res.status(200).json({
        status: "error",
        message: error.message,
      });
    }
  }

  /**
   * Get webhook logs (Admin only)
   */
  async getLogs(req, res) {
    try {
      const result = await webhookService.getLogs(req.query);
      res.json({
        data: result.logs,
        total: result.total,
        offset: parseInt(req.query.offset) || 0,
        limit: parseInt(req.query.limit) || 50,
      });
    } catch (error) {
      console.error("Get webhook logs error:", error);
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new WebhookController();
