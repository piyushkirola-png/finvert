const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  loginValidation,
  registerValidation,
  forgotPasswordValidation,
  verifyOtpValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  updatePasswordValidation,
} = require("../controllers/auth/auth.validation");

// ==================== ADMIN AUTH ROUTES ====================
router.post("/admin/login", loginValidation, authController.adminLogin);

// ==================== USER AUTH ROUTES ====================
router.post("/user/register", registerValidation, authController.register);
router.post("/user/login", loginValidation, authController.userLogin);

// ==================== COMMON AUTH ROUTES ====================
router.post(
  "/refresh-token",
  refreshTokenValidation,
  authController.refreshToken,
);
router.post("/logout", authMiddleware, authController.logout);
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  authController.forgotPassword,
);
router.post("/verify-otp", verifyOtpValidation, authController.verifyOtp);
router.post(
  "/reset-password",
  resetPasswordValidation,
  authController.resetPassword,
);
router.get("/profile", authMiddleware, authController.getProfile);
router.put(
  "/update-password",
  authMiddleware,
  updatePasswordValidation,
  authController.updatePassword,
);

module.exports = router;
