const loginValidation = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }
  next();
};

const registerValidation = (req, res, next) => {
  const { email, password, fullName, phoneNumber } = req.body;
  if (!email || !password || !fullName || !phoneNumber) {
    return res.status(400).json({
      success: false,
      message: "Email, password, full name, and phone number are required",
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }
  next();
};

const forgotPasswordValidation = (req, res, next) => {
  const { email, role } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }
  if (role && !["admin", "user"].includes(role)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid role. Use 'admin' or 'user'" });
  }
  next();
};

const verifyOtpValidation = (req, res, next) => {
  const { email, otp, role } = req.body;
  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP are required" });
  }
  next();
};

const resetPasswordValidation = (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Reset token and new password are required",
    });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }
  next();
};

const refreshTokenValidation = (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
  }
  next();
};

const updatePasswordValidation = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters",
    });
  }

  next();
};

module.exports = {
  loginValidation,
  registerValidation,
  forgotPasswordValidation,
  verifyOtpValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  updatePasswordValidation,
};
