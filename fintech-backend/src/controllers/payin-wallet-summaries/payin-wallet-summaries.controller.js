const payInWalletSummariesService = require("./payin-wallet-summaries.service");

class PayInWalletSummariesController {
  async findAll(req, res) {
    try {
      let merchantId = null;
      let userId = null;
      if (req.user.role === "USER") {
        merchantId = req.user.merchantId;
        userId = req.user.id;
      }
      const result = await payInWalletSummariesService.findAll(
        merchantId,
        userId,
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async findOne(req, res) {
    try {
      const merchantId = parseInt(req.params.merchantId);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      // Merchant can only view their own summary
      if (req.user.role === "USER" && req.user.merchantId !== merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      let userId = null;
      if (req.user.role === "USER") {
        userId = req.user.id;
      }

      const result = await payInWalletSummariesService.findOne(
        merchantId,
        userId,
      );
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  // Refresh a specific merchant's summary
  async refreshSummary(req, res) {
    try {
      const merchantId = parseInt(req.params.merchantId);
      if (isNaN(merchantId)) {
        return res.status(400).json({ error: "Invalid merchant ID" });
      }

      // Security check: Merchant can only refresh their own summary
      if (req.user.role === "USER" && req.user.merchantId !== merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      let userId =
        req.user.role === "USER" ? req.user.id : req.body.userId || req.user.id;

      const result = await payInWalletSummariesService.refreshSummary(
        merchantId,
        userId,
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Refresh ALL merchants' summaries (Admin only)
  async refreshAllSummaries(req, res) {
    try {
      const result = await payInWalletSummariesService.refreshAllSummaries();
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new PayInWalletSummariesController();
