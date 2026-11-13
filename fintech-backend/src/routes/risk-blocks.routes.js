const express = require("express");
const router = express.Router();
const riskBlocksController = require("../controllers/risk-blocks/risk-blocks.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const {
  validateRiskBlock,
  validateRiskBlockUpdate,
} = require("../controllers/risk-blocks/risk-blocks.validation");

router.use(authMiddleware);
router.use(authorize("ADMIN", "SUPER_ADMIN"));

router.post("/", validateRiskBlock, riskBlocksController.createRiskBlock);
router.get("/", riskBlocksController.getRiskBlocks);
router.get("/:id", riskBlocksController.getRiskBlockById);
router.put(
  "/:id",
  validateRiskBlockUpdate,
  riskBlocksController.updateRiskBlock,
);
router.delete("/:id", riskBlocksController.deleteRiskBlock);

module.exports = router;
