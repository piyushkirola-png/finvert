const prisma = require("../../../config/prisma");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../../utils/jwt.util");
const auditLogService = require("../../services/audit-log.service");
const { decrypt } = require("../../utils/encryption.util");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ==================== ADMIN LOGIN ====================
const adminLogin = async (email, password) => {
  const cleanEmail = email.trim().toLowerCase();

  const admin = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
  });

  if (!admin) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(password, admin.hashedPassword);
  if (!isMatch) {
    await auditLogService.logFailedLogin(email, null, null, "Invalid password");
    throw new Error("Invalid credentials");
  }

  const accessToken = generateAccessToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    defaultCurrency: admin.defaultCurrency || "USD",
  });

  const refreshToken = generateRefreshToken({
    id: admin.id,
    timestamp: Date.now(),
  });

  await prisma.userSession.deleteMany({
    where: { userId: admin.id },
  });

  await prisma.userSession.create({
    data: {
      userId: admin.id,
      refreshToken,
      accessToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0 },
  });
  await auditLogService.logLogin(admin.id, admin.email, null, null);

  return {
    accessToken,
    refreshToken,
    user: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      defaultCurrency: admin.defaultCurrency,
    },
  };
};

// ==================== USER REGISTER ====================
const register = async (data) => {
  const { email, password, fullName, phoneNumber } = data;
  const cleanEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (existing) throw new Error("User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      hashedPassword,
      fullName,
      phoneNumber,
      role: "USER",
      isActive: true,
    },
  });

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId,
    defaultCurrency: "USD",
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    timestamp: Date.now(),
  });

  await prisma.userSession.deleteMany({
    where: { userId: user.id },
  });

  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken,
      accessToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      merchantId: user.merchantId,
    },
  };
};

// ==================== USER LOGIN ====================
const userLogin = async (data) => {
  const { email, password } = data;
  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: cleanEmail,
      role: { in: ["USER"] },
      isActive: true,
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          isActive: true,
          clientSecret: true,
          planType: true,
          bulkUploadEnabled: true,
        },
      },
    },
  });

  if (!user) {
    await auditLogService.logFailedLogin(email, null, null, "User not found");
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!isMatch) {
    await auditLogService.logFailedLogin(email, null, null, "Invalid password");
    throw new Error("Invalid credentials");
  }

  if (user.role === "USER" && (!user.merchant || !user.merchant.isActive)) {
    throw new Error("Associated merchant is inactive");
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId,
    defaultCurrency: user.defaultCurrency || "USD",
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    timestamp: Date.now(),
  });

  await prisma.userSession.deleteMany({
    where: { userId: user.id },
  });

  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken,
      accessToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0 },
  });
  await auditLogService.logLogin(user.id, user.email, null, null);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      merchantId: user.merchantId,
      defaultCurrency: user.defaultCurrency,
      clientSecret: user.merchant?.clientSecret || null,
      planType: user.merchant?.planType || "BASIC",
      bulkUploadEnabled: user.merchant?.bulkUploadEnabled || false,
    },
  };
};

// ==================== REFRESH TOKEN ====================
const refreshToken = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) throw new Error("Invalid refresh token");

  const session = await prisma.userSession.findFirst({
    where: { refreshToken, isRevoked: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!session || !session.user.isActive) throw new Error("Invalid session");

  const newAccessToken = generateAccessToken({
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    merchantId: session.user.merchantId,
  });

  await prisma.userSession.update({
    where: { id: session.id },
    data: { accessToken: newAccessToken },
  });

  return { accessToken: newAccessToken };
};

// ==================== LOGOUT ====================
const logout = async (accessToken) => {
  const session = await prisma.userSession.findFirst({
    where: { accessToken, isRevoked: false },
    include: { user: true },
  });

  await prisma.userSession.updateMany({
    where: { accessToken, isRevoked: false },
    data: { isRevoked: true },
  });

  if (session?.user) {
    await auditLogService.logLogout(session.user.id, session.user.email);
  }

  return { success: true };
};

// ==================== FORGOT PASSWORD ====================
const forgotPassword = async (email, role = "user") => {
  const cleanEmail = email.trim().toLowerCase();

  const roleFilter =
    role === "admin" ? { in: ["ADMIN", "SUPER_ADMIN"] } : { in: ["USER"] };

  const user = await prisma.user.findFirst({
    where: { email: cleanEmail, role: roleFilter },
  });

  if (!user) throw new Error("User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.user.update({
    where: { id: user.id },
    data: { otp, otpExpiry: new Date(Date.now() + 10 * 60 * 1000) },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset OTP",
    html: `<h1>Your OTP is: ${otp}</h1><p>Valid for 10 minutes.</p>`,
  });
};

// ==================== VERIFY OTP ====================
const verifyOtp = async (email, otp, role = "user") => {
  const cleanEmail = email.trim().toLowerCase();

  const roleFilter =
    role === "admin" ? { in: ["ADMIN", "SUPER_ADMIN"] } : { in: ["USER"] };

  const user = await prisma.user.findFirst({
    where: { email: cleanEmail, role: roleFilter },
  });

  if (!user) throw new Error("User not found");
  if (user.otp !== otp) throw new Error("Invalid OTP");
  if (new Date(user.otpExpiry) < new Date()) throw new Error("OTP expired");

  const resetToken = generateAccessToken({ email: cleanEmail });
  return { resetToken };
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (resetToken, newPassword) => {
  if (!resetToken) throw new Error("Reset token missing");

  let decoded;
  try {
    decoded = verifyRefreshToken(resetToken);
    if (!decoded) throw new Error();
  } catch {
    throw new Error("Invalid or expired token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email: decoded.email },
    data: { hashedPassword, otp: null, otpExpiry: null },
  });

  const user = await prisma.user.findUnique({
    where: { email: decoded.email },
  });
  if (user) {
    await auditLogService.logPasswordReset(user.id, user.email);
  }
};

// ==================== UPDATE PROFILE ====================
const updateProfile = async (userId, data) => {
  const updateData = {};
  if (data.name) updateData.fullName = data.name;
  if (data.email) updateData.email = data.email;
  if (data.password && data.password.trim() !== "") {
    updateData.hashedPassword = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  delete user.hashedPassword;
  return user;
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      isActive: true,
      emailVerified: true,
      role: true,
      merchantId: true,
      createdAt: true,
      updatedAt: true,
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          businessName: true,
          businessType: true,
          gstin: true,
          createdAt: true,
          updatedAt: true,
          status: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  // Decrypt merchant sensitive fields before returning
  if (user.merchant && user.merchant.gstin) {
    try {
      user.merchant.gstin = decrypt(user.merchant.gstin);
    } catch (err) {
      console.warn("GSTIN decrypt failed, returning raw value:", err.message);
    }
  }

  return user;
};

// ==================== UPDATE PASSWORD ONLY ====================
const updatePassword = async (userId, currentPassword, newPassword) => {
  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      hashedPassword: true,
    },
  });

  if (!user) throw new Error("User not found");

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!isMatch) throw new Error("Current password is incorrect");

  // Validate new password
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      hashedPassword,
      passwordChangedAt: new Date(),
    },
  });
  await auditLogService.logPasswordChange(userId, user.email);

  // Revoke all existing sessions for security
  await prisma.userSession.updateMany({
    where: { userId: userId, isRevoked: false },
    data: { isRevoked: true },
  });

  return { success: true };
};

// ==================== EXPORTS ====================
module.exports = {
  adminLogin,
  register,
  userLogin,
  refreshToken,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getProfile,
  updatePassword,
};
