const merchantService = require("./merchants.service");

// ASSIGN USER
const assignUserToMerchant = async (req, res) => {
  try {
    const { merchantId, userId } = req.body;

    const result = await merchantService.assignUserToMerchant(
      merchantId,
      userId,
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// REMOVE USER
const removeUserFromMerchant = async (req, res) => {
  try {
    const { merchantId, userId } = req.params;

    const result = await merchantService.removeUserFromMerchant(
      merchantId,
      userId,
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE
const createMerchant = async (req, res) => {
  try {
    const merchant = await merchantService.createMerchant(req.body);

    return res.status(201).json({
      success: true,
      data: merchant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL
const getAllMerchants = async (req, res) => {
  try {
    const merchants = await merchantService.getAllMerchants(req.user);

    return res.status(200).json({
      success: true,
      data: merchants,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET BY ID
const getMerchantById = async (req, res) => {
  try {
    const merchant = await merchantService.getMerchantById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: merchant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
const updateMerchant = async (req, res) => {
  try {
    const merchant = await merchantService.updateMerchant(
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      data: merchant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
const deleteMerchant = async (req, res) => {
  try {
    await merchantService.deleteMerchant(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Merchant deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// STATS
const getMerchantStats = async (req, res) => {
  try {
    const stats = await merchantService.getMerchantStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SUMMARY
const getMerchantSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await merchantService.getMerchantSummary(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ========== IP WHITELIST CONTROLLERS ==========

// Get whitelisted IPs
const getWhitelistedIps = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await merchantService.getWhitelistedIps(Number(id));

    return res.status(200).json({
      success: true,
      data: result,
      message: "IPs fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching IPs:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch IPs",
    });
  }
};

// Add IP to whitelist
const addIpToWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        message: "IP address is required",
      });
    }

    // Validate IP format (IPv4)
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IP address format",
      });
    }

    const result = await merchantService.addIpToWhitelist(Number(id), ip);

    return res.status(201).json({
      success: true,
      data: result,
      message: "IP added successfully",
    });
  } catch (error) {
    console.error("Error adding IP:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add IP",
    });
  }
};

// Update IP in whitelist
const updateIpInWhitelist = async (req, res) => {
  try {
    const { id, ip } = req.params;
    const { ip: newIp } = req.body;

    if (!newIp) {
      return res.status(400).json({
        success: false,
        message: "New IP address is required",
      });
    }

    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IP address format",
      });
    }

    const result = await merchantService.updateIpInWhitelist(
      Number(id),
      ip,
      newIp,
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: "IP updated successfully",
    });
  } catch (error) {
    console.error("Error updating IP:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update IP",
    });
  }
};

// Delete IP from whitelist
const deleteIpFromWhitelist = async (req, res) => {
  try {
    const { id, ip } = req.params;

    const result = await merchantService.deleteIpFromWhitelist(Number(id), ip);

    return res.status(200).json({
      success: true,
      data: result,
      message: "IP deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting IP:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete IP",
    });
  }
};

// ========== WEBHOOK FORMAT CONTROLLERS ==========

// Get merchant's webhook config
const getWebhookConfig = async (req, res) => {
  try {
    const data = await merchantService.getWebhookConfig(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Save merchant's webhook config (body: { config: {...} } ya { config: null })
const updateWebhookConfig = async (req, res) => {
  try {
    if (req.body.config === undefined) {
      return res.status(400).json({
        success: false,
        message: "config is required (object, or null for default)",
      });
    }

    const data = await merchantService.updateWebhookConfig(
      req.params.id,
      req.body.config,
    );
    return res.status(200).json({
      success: true,
      data,
      message: data.usingDefault
        ? "Webhook format reset to default"
        : "Webhook format saved",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Preview (nothing saved)
const previewWebhookConfig = async (req, res) => {
  try {
    if (!req.body.config) {
      return res
        .status(400)
        .json({ success: false, message: "config is required" });
    }
    const data = merchantService.previewWebhookConfig(req.body.config);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Dropdown options for frontend
const getWebhookFormatOptions = async (req, res) => {
  try {
    const data = merchantService.getWebhookFormatOptions();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// APPROVE MERCHANT
const approveMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await merchantService.approveMerchant(id);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// REJECT MERCHANT
const rejectMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await merchantService.rejectMerchant(id);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createMerchant,
  approveMerchant,
  rejectMerchant,
  getAllMerchants,
  getMerchantById,
  updateMerchant,
  deleteMerchant,
  getMerchantStats,
  assignUserToMerchant,
  removeUserFromMerchant,
  getMerchantSummary,
  getWhitelistedIps,
  addIpToWhitelist,
  updateIpInWhitelist,
  deleteIpFromWhitelist,
  getWebhookConfig,
  updateWebhookConfig,
  previewWebhookConfig,
  getWebhookFormatOptions,
};
