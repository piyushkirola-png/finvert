const gatewayMerchantMappingsService = require("./gateway-merchant-mappings.service");

// GET ALL MAPPINGS
const getAllMappings = async (req, res) => {
  try {
    const data = await gatewayMerchantMappingsService.getAllMappings(req.query);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get all mappings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET MAPPINGS BY GATEWAY
const getMappingsByGateway = async (req, res) => {
  try {
    const data = await gatewayMerchantMappingsService.getMappingsByGateway(
      req.params.gatewayId,
    );
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get mappings by gateway error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET MAPPINGS BY MERCHANT
const getMappingsByMerchant = async (req, res) => {
  try {
    const data = await gatewayMerchantMappingsService.getMappingsByMerchant(
      req.params.merchantId,
    );
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get mappings by merchant error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET SINGLE MAPPING BY ID
const getMappingById = async (req, res) => {
  try {
    const data = await gatewayMerchantMappingsService.getMappingById(
      req.params.id,
    );
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Mapping not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get mapping by id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * CREATE new mapping
 */
const createMapping = async (req, res) => {
  try {
    const { gatewayId, merchantId, status } = req.body;

    // Validation
    if (!gatewayId || !merchantId) {
      return res.status(400).json({
        success: false,
        message: "Gateway ID and Merchant ID are required",
      });
    }

    const data = await gatewayMerchantMappingsService.createMapping({
      gatewayId,
      merchantId,
      status,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("Create mapping error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * UPDATE mapping
 */
const updateMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const data = await gatewayMerchantMappingsService.updateMapping(id, {
      status,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Update mapping error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * DELETE mapping
 */
const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    await gatewayMerchantMappingsService.deleteMapping(id);
    res.json({ success: true, message: "Mapping deleted successfully" });
  } catch (err) {
    console.error("Delete mapping error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * BULK CREATE mappings
 */
const bulkCreateMappings = async (req, res) => {
  try {
    const { merchantId, gatewayIds, status } = req.body;

    if (
      !merchantId ||
      !gatewayIds ||
      !Array.isArray(gatewayIds) ||
      gatewayIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID and at least one Gateway ID are required",
      });
    }

    const result = await gatewayMerchantMappingsService.bulkCreateMappings({
      merchantId,
      gatewayIds,
      status,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `${result.results.length} mappings created, ${result.errors.length} failed`,
    });
  } catch (err) {
    console.error("Bulk create mappings error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllMappings,
  getMappingsByGateway,
  getMappingsByMerchant,
  getMappingById,
  createMapping,
  updateMapping,
  deleteMapping,
  bulkCreateMappings,
};
