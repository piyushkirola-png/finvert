const riskBlocksService = require("./risk-blocks.service");

const createRiskBlock = async (req, res) => {
  try {
    const riskBlock = await riskBlocksService.createRiskBlock(
      req.body,
      req.user?.id,
    );

    await notificationService.notifyRiskBlockCreated(riskBlock);

    res.status(201).json({ success: true, riskBlock });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getRiskBlocks = async (req, res) => {
  try {
    const query = {
      type: req.query.type,
      value: req.query.value,
      isActive:
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined,
    };
    const riskBlocks = await riskBlocksService.getRiskBlocks(query);
    res.status(200).json({ success: true, riskBlocks });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getRiskBlockById = async (req, res) => {
  try {
    const riskBlock = await riskBlocksService.getRiskBlockById(req.params.id);
    res.status(200).json({ success: true, riskBlock });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const updateRiskBlock = async (req, res) => {
  try {
    const riskBlock = await riskBlocksService.updateRiskBlock(
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, riskBlock });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteRiskBlock = async (req, res) => {
  try {
    // Check if risk block exists
    const existingBlock = await riskBlocksService.getRiskBlockById(
      req.params.id,
    );

    if (!existingBlock) {
      return res.status(404).json({
        success: false,
        message: "Risk block not found",
      });
    }

    // If active, soft delete (set isActive to false)
    if (existingBlock.isActive) {
      await riskBlocksService.deleteRiskBlock(req.params.id);
      return res.status(200).json({
        success: true,
        message: "Risk block deactivated successfully",
      });
    } else {
      // If inactive, permanently delete from database
      await riskBlocksService.permanentlyDeleteRiskBlock(req.params.id);
      return res.status(200).json({
        success: true,
        message: "Risk block permanently deleted successfully",
      });
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createRiskBlock,
  getRiskBlocks,
  getRiskBlockById,
  updateRiskBlock,
  deleteRiskBlock,
};
