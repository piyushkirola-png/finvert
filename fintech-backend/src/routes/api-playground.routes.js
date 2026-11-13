const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

const {
  createPayInPlaygroundValidation,
} = require("../controllers/api-playground/payin/api-playground.validation");
const {
  createPlaygroundPayin,
} = require("../controllers/api-playground/payin/api-playground.controller");

const {
  createPayoutPlaygroundValidation,
} = require("../controllers/api-playground/payout/api-playground.validation");
const {
  createPlaygroundPayout,
} = require("../controllers/api-playground/payout/api-playground.controller");

router.use(authMiddleware);

// Payin Playground (User only)
router.post(
  "/payin",
  authorize("USER"),
  createPayInPlaygroundValidation,
  createPlaygroundPayin,
);

// Payout Playground (User only)
router.post(
  "/payout",
  authorize("USER"),
  createPayoutPlaygroundValidation,
  createPlaygroundPayout,
);

module.exports = router;
