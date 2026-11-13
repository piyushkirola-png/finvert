const gatewayService = require("./gateway.service");

// CREATE
const createGateway = async (req, res) => {
  try {
    const data = await gatewayService.createGateway(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("Create Gateway Error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET ALL
const getAllGateways = async (req, res) => {
  try {
    const data = await gatewayService.getAllGateways();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ONE
const getGatewayById = async (req, res) => {
  try {
    const data = await gatewayService.getGatewayById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// UPDATE
const updateGateway = async (req, res) => {
  try {
    const data = await gatewayService.updateGateway(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
const deleteGateway = async (req, res) => {
  try {
    await gatewayService.deleteGateway(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createGateway,
  getAllGateways,
  getGatewayById,
  updateGateway,
  deleteGateway,
};
