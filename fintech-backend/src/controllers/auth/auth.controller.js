const { get } = require("../../routes/auth.routes");
const authService = require("./auth.service");

// ==================== ADMIN AUTH ====================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.adminLogin(email, password);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

// ==================== USER AUTH ====================
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const userLogin = async (req, res) => {
  try {
    const result = await authService.userLogin(req.body);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

// ==================== COMMON AUTH ====================
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    await authService.logout(token);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    await authService.forgotPassword(email, role);
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp, role } = req.body;
    const result = await authService.verifyOtp(email, otp, role);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    await authService.resetPassword(resetToken, newPassword);
    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await authService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUser = await authService.updateProfile(userId, req.body);
    res
      .status(200)
      .json({ success: true, message: "Profile updated", user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    await authService.updatePassword(userId, currentPassword, newPassword);
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  adminLogin,
  register,
  userLogin,
  refreshToken,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updateProfile,
  getProfile,
  updatePassword,
};
