const prisma = require("../../../config/prisma");
const bcrypt = require("bcryptjs");
const auditLogService = require("../../services/audit-log.service");

const createUser = async (data) => {
  const { fullName, email, phoneNumber, password, isActive, merchantId, role } =
    data;
  const cleanEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (existing) throw new Error("User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email: cleanEmail,
      phoneNumber,
      hashedPassword,
      isActive: isActive !== undefined ? isActive : true,
      merchantId: merchantId || null,
      role: role || "USER",
    },
  });
  await auditLogService.logUserCreated(null, user.email, user.role);

  delete user.hashedPassword;
  return user;
};

const getAllUsers = async (filters = {}) => {
  const { role, isActive, merchantId, search, limit, offset } = filters;

  const where = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === true || isActive === "true" ? true : false;
  }

  if (merchantId) {
    where.merchantId = Number(merchantId);
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    ...(limit ? { take: Number(limit) } : {}),
    ...(offset ? { skip: Number(offset) } : {}),
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      merchantId: true,
      createdAt: true,
    },
  });
  return users;
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      merchantId: true,
      createdAt: true,
    },
  });
  if (!user) throw new Error("User not found");
  return user;
};

const updateUser = async (id, data) => {
  const userId = Number(id);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existingUser) throw new Error(`User with ID ${userId} not found`);

  const updateData = {};

  // Only add fields if they exist in the request
  if (data.fullName !== undefined && data.fullName !== null) {
    updateData.fullName = data.fullName;
  }
  if (data.email !== undefined && data.email !== null) {
    updateData.email = data.email;
  }
  if (data.phoneNumber !== undefined && data.phoneNumber !== null) {
    updateData.phoneNumber = data.phoneNumber;
  }
  if (data.isActive !== undefined && data.isActive !== null) {
    updateData.isActive = data.isActive;
  }
  if (data.role !== undefined && data.role !== null) {
    updateData.role = data.role;
  }

  // Handle password separately
  if (data.password && data.password.trim() !== "") {
    updateData.hashedPassword = await bcrypt.hash(data.password, 10);
  }

  // Don't update if no fields to update
  if (Object.keys(updateData).length === 0) {
    throw new Error("No valid fields to update");
  }

  // Perform the update
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  const changes = {};
  if (data.fullName !== undefined) changes.fullName = data.fullName;
  if (data.email !== undefined) changes.email = data.email;
  if (data.role !== undefined) changes.role = data.role;
  if (data.isActive !== undefined) changes.isActive = data.isActive;
  await auditLogService.logUserUpdated(null, userId, user.email, changes);

  delete user.hashedPassword;
  return user;
};

const deleteUser = async (id) => {
  const userId = Number(id);

  // Check if user exists first
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");

  await auditLogService.logUserDeleted(null, userId, user.email);

  // Soft delete - just deactivate
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  delete updatedUser.hashedPassword;
  return updatedUser;
};

const hardDeleteUser = async (id) => {
  const userId = Number(id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");

  // Delete related records first
  await prisma.userSession.deleteMany({ where: { userId: userId } });
  await prisma.passwordReset.deleteMany({ where: { userId: userId } });
  await prisma.userPermission.deleteMany({ where: { userId: userId } });
  await prisma.auditLog.deleteMany({ where: { userId: userId } });

  return await prisma.user.delete({ where: { id: userId } });
};
``;

const removeUserFromMerchant = async (userId) => {
  return await prisma.user.update({
    where: { id: Number(userId) },
    data: { merchantId: null },
  });
};

const updateCurrency = async (userId, defaultCurrency) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!defaultCurrency) {
    throw new Error("Default currency is required");
  }

  if (defaultCurrency === "INR") {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { defaultCurrency },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        merchantId: true,
        defaultCurrency: true,
        isActive: true,
        emailVerified: true,
        phoneNumber: true,
      },
    });
    return updatedUser;
  }

  const validCurrency = await prisma.currencyRate.findFirst({
    where: {
      baseCurrency: defaultCurrency,
      quoteCurrency: "INR",
      validFrom: { lte: new Date() },
    },
  });

  if (!validCurrency) {
    throw new Error(`Currency ${defaultCurrency} is not supported`);
  }

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { defaultCurrency },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      merchantId: true,
      defaultCurrency: true,
      isActive: true,
      emailVerified: true,
      phoneNumber: true,
    },
  });

  return updatedUser;
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  hardDeleteUser,
  removeUserFromMerchant,
  updateCurrency,
};
