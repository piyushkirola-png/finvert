const express = require("express");
const router = express.Router();
const userController = require("../controllers/users/users.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const {
  createUserValidation,
  updateUserValidation,
} = require("../controllers/users/users.validation");

// Auth required for all routes
router.use(authMiddleware);
router.put("/currency", userController.updateCurrency);

// These routes require ADMIN role
router.use(authorize("SUPER_ADMIN", "ADMIN"));

router.post("/", createUserValidation, userController.createUser);
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", updateUserValidation, userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.delete("/:userId/merchant", userController.removeUserFromMerchant);

module.exports = router;
