const merchantRoutingService = require("./merchant-routing.service");

// CREATE
const createMerchantRouting = async (req, res) => {
  try {
    const data = await merchantRoutingService.createMerchantRouting(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("Create Merchant Routing Error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET ALL
const getAllMerchantRouting = async (req, res) => {
  try {
    const data = await merchantRoutingService.getAllMerchantRouting();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ONE
const getMerchantRoutingById = async (req, res) => {
  try {
    const data = await merchantRoutingService.getMerchantRoutingById(
      req.params.id,
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// GET BY MERCHANT
const getMerchantRoutingByMerchant = async (req, res) => {
  try {
    const data = await merchantRoutingService.getMerchantRoutingByMerchant(
      req.params.merchantId,
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// UPDATE
const updateMerchantRouting = async (req, res) => {
  try {
    const data = await merchantRoutingService.updateMerchantRouting(
      req.params.id,
      req.body,
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
const deleteMerchantRouting = async (req, res) => {
  try {
    await merchantRoutingService.deleteMerchantRouting(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createMerchantRouting,
  getAllMerchantRouting,
  getMerchantRoutingById,
  getMerchantRoutingByMerchant,
  updateMerchantRouting,
  deleteMerchantRouting,
};
