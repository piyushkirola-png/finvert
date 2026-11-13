const prisma = require("../../../config/prisma");
const { Prisma } = require("@prisma/client");
const {
  encrypt,
  decrypt,
  encryptIpList,
  decryptIpList,
} = require("../../utils/encryption.util");
const crypto = require("crypto");
const auditLogService = require("../../services/audit-log.service");
const {
  validateWebhookConfig,
  previewWebhook,
  getAllowedSources,
  getAllowedStatuses,
} = require("../../utils/webhook-formatter");

// Generate random secret key
const generateSecretKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

// ASSIGN USER
const assignUserToMerchant = async (merchantId, userId) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });
  if (!merchant) throw new Error("Merchant not found");

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });
  if (!user) throw new Error("User not found");

  await prisma.user.update({
    where: { id: Number(userId) },
    data: {
      merchantId: Number(merchantId),
      role: "USER",
    },
  });

  return {
    success: true,
    message: "User assigned to merchant successfully",
  };
};

// REMOVE USER FROM MERCHANT
const removeUserFromMerchant = async (merchantId, userId) => {
  await prisma.user.update({
    where: { id: Number(userId) },
    data: {
      merchantId: null,
      role: "USER",
    },
  });

  return {
    success: true,
    message: "User removed from merchant successfully",
  };
};

// CREATE MERCHANT
const createMerchant = async (data) => {
  if (!data.merchantName) {
    throw new Error("Merchant name is required");
  }
  if (!data.email) {
    throw new Error("Email is required");
  }

  const existingMerchant = await prisma.merchant.findFirst({
    where: {
      OR: [{ email: data.email }, { name: data.merchantName }],
    },
  });

  if (existingMerchant) {
    throw new Error(
      `Merchant with email "${data.email}" or name "${data.merchantName}" already exists`,
    );
  }

  const secretKey = generateSecretKey();
  const clientSecret = crypto.randomBytes(32).toString("hex");
  const clientId = crypto.randomUUID();

  const encryptedGstin = data.gstin ? encrypt(data.gstin) : null;
  const encryptedAccountNumber = data.accountNumber
    ? encrypt(data.accountNumber)
    : null;
  const encryptedIfscCode = data.ifscCode ? encrypt(data.ifscCode) : null;
  const encryptedClientSecret = encrypt(clientSecret);
  const encryptedIpWhitelist = data.ipWhitelist
    ? encryptIpList(data.ipWhitelist)
    : [];
  const encryptedPanNumber = data.panNumber ? encrypt(data.panNumber) : null;
  const encryptedBankAccountName = data.bankAccountName
    ? encrypt(data.bankAccountName)
    : null;

  const merchant = await prisma.merchant.create({
    data: {
      name: data.merchantName,
      email: data.email,
      phone: data.phone,
      isActive: data.status === "ACTIVE",
      secretKey: secretKey,
      clientId: clientId,
      clientSecret: encryptedClientSecret,
      webhookUrl: data.webhookUrl,
      webhookSecret: data.webhookSecret,
      businessName: data.businessName,
      websiteUrl: data.websiteUrl,
      businessType: data.businessType,
      gstin: encryptedGstin,
      bankName: data.bankName,
      accountNumber: encryptedAccountNumber,
      ifscCode: encryptedIfscCode,
      settlementCurrency: data.settlementCurrency || "INR",
      paymentMethods: data.paymentMethods || [],
      status: data.status || "ACTIVE",
      planType: data.planType || "BASIC",
      bulkUploadEnabled: data.planType === "PREMIUM",
      ipWhitelist: encryptedIpWhitelist,

      // new business fields
      contactPerson: data.contactPerson ?? null,
      businessPhone: data.businessPhone ?? null,
      businessEmail: data.businessEmail ?? null,
      businessAddress: data.businessAddress ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      pinCode: data.pinCode ?? null,
      zone: data.zone ?? null,
      panNumber: encryptedPanNumber,
      nameAsPerPan: data.nameAsPerPan ?? null,
      incorporationDate: data.incorporationDate ?? null,
      gstStatus: data.gstStatus ?? null,
      merchantCategory: data.merchantCategory ?? null,
      annualTurnover: data.annualTurnover ?? null,
      operatingCountry: data.operatingCountry ?? null,
      numberOfEmployees: data.numberOfEmployees ?? null,

      // new bank fields
      bankAccountType: data.bankAccountType ?? null,
      bankAccountName: encryptedBankAccountName,
    },
  });

  await auditLogService.logMerchantCreated(null, merchant.name, merchant.email);

  return merchant;
};

// GET ALL
const getAllMerchants = async (user) => {
  try {
    let whereClause = {};

    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      whereClause = {};
    } else if (user.role === "USER") {
      if (!user.merchantId) {
        return [];
      }
      whereClause = {
        id: user.merchantId,
      };
    } else {
      return [];
    }

    const merchants = await prisma.merchant.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return merchants.map((merchant) => ({
      id: merchant.id,
      merchantName: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      clientId: merchant.clientId,
      clientSecret: merchant.clientSecret
        ? decrypt(merchant.clientSecret)
        : null,
      businessName: merchant.businessName,
      websiteUrl: merchant.websiteUrl,
      businessType: merchant.businessType,
      gstin: merchant.gstin ? decrypt(merchant.gstin) : null,
      bankName: merchant.bankName,
      accountNumber: merchant.accountNumber
        ? decrypt(merchant.accountNumber)
        : null,
      ifscCode: merchant.ifscCode ? decrypt(merchant.ifscCode) : null,
      settlementCurrency: merchant.settlementCurrency,
      status: merchant.status,
      isActive: merchant.isActive,
      paymentMethods: merchant.paymentMethods,
      planType: merchant.planType || "BASIC",
      bulkUploadEnabled: merchant.bulkUploadEnabled,

      // new
      contactPerson: merchant.contactPerson,
      businessPhone: merchant.businessPhone,
      businessEmail: merchant.businessEmail,
      businessAddress: merchant.businessAddress,
      city: merchant.city,
      state: merchant.state,
      pinCode: merchant.pinCode,
      zone: merchant.zone,
      panNumber: merchant.panNumber ? decrypt(merchant.panNumber) : null,
      nameAsPerPan: merchant.nameAsPerPan,
      incorporationDate: merchant.incorporationDate,
      gstStatus: merchant.gstStatus,
      merchantCategory: merchant.merchantCategory,
      annualTurnover: merchant.annualTurnover,
      operatingCountry: merchant.operatingCountry,
      numberOfEmployees: merchant.numberOfEmployees,
      bankAccountType: merchant.bankAccountType,
      bankAccountName: merchant.bankAccountName
        ? decrypt(merchant.bankAccountName)
        : null,

      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
    }));
  } catch (error) {
    console.error("Error in getAllMerchants:", error);
    throw error;
  }
};

// GET BY ID
const getMerchantById = async (id) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
  });

  if (!merchant) return null;

  return {
    id: merchant.id,
    merchantName: merchant.name,
    email: merchant.email,
    phone: merchant.phone,
    webhookUrl: merchant.webhookUrl,
    webhookSecret: merchant.webhookSecret,
    businessName: merchant.businessName,
    websiteUrl: merchant.websiteUrl,
    businessType: merchant.businessType,
    gstin: merchant.gstin ? decrypt(merchant.gstin) : null,
    bankName: merchant.bankName,
    accountNumber: merchant.accountNumber
      ? decrypt(merchant.accountNumber)
      : null,
    ifscCode: merchant.ifscCode ? decrypt(merchant.ifscCode) : null,
    settlementCurrency: merchant.settlementCurrency,
    status: merchant.status,
    isActive: merchant.isActive,
    paymentMethods: merchant.paymentMethods,
    planType: merchant.planType || "BASIC",
    bulkUploadEnabled: merchant.bulkUploadEnabled,

    contactPerson: merchant.contactPerson,
    businessPhone: merchant.businessPhone,
    businessEmail: merchant.businessEmail,
    businessAddress: merchant.businessAddress,
    city: merchant.city,
    state: merchant.state,
    pinCode: merchant.pinCode,
    zone: merchant.zone,
    panNumber: merchant.panNumber ? decrypt(merchant.panNumber) : null,
    nameAsPerPan: merchant.nameAsPerPan,
    incorporationDate: merchant.incorporationDate,
    gstStatus: merchant.gstStatus,
    merchantCategory: merchant.merchantCategory,
    annualTurnover: merchant.annualTurnover,
    operatingCountry: merchant.operatingCountry,
    numberOfEmployees: merchant.numberOfEmployees,
    bankAccountType: merchant.bankAccountType,
    bankAccountName: merchant.bankAccountName
      ? decrypt(merchant.bankAccountName)
      : null,

    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
  };
};

// UPDATE
const updateMerchant = async (id, data) => {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
  });
  if (!existingMerchant) throw new Error("Merchant not found");

  const updateData = {};

  if (data.merchantName !== undefined) updateData.name = data.merchantName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
  if (data.webhookSecret !== undefined)
    updateData.webhookSecret = data.webhookSecret;
  if (data.businessName !== undefined)
    updateData.businessName = data.businessName;
  if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
  if (data.businessType !== undefined)
    updateData.businessType = data.businessType;
  if (data.gstin !== undefined)
    updateData.gstin = data.gstin ? encrypt(data.gstin) : null;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.accountNumber !== undefined)
    updateData.accountNumber = data.accountNumber
      ? encrypt(data.accountNumber)
      : null;
  if (data.ifscCode !== undefined)
    updateData.ifscCode = data.ifscCode ? encrypt(data.ifscCode) : null;
  if (data.ipWhitelist !== undefined)
    updateData.ipWhitelist = data.ipWhitelist
      ? encryptIpList(data.ipWhitelist)
      : [];
  if (data.clientSecret !== undefined)
    updateData.clientSecret = data.clientSecret
      ? encrypt(data.clientSecret)
      : null;
  if (data.settlementCurrency !== undefined)
    updateData.settlementCurrency = data.settlementCurrency;
  if (data.paymentMethods !== undefined)
    updateData.paymentMethods = data.paymentMethods;
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.isActive = data.status === "ACTIVE";
  }
  if (data.planType !== undefined) {
    updateData.planType = data.planType;
    updateData.bulkUploadEnabled = data.planType === "PREMIUM";
  }

  // new business fields
  if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
  if (data.businessPhone !== undefined) updateData.businessPhone = data.businessPhone;
  if (data.businessEmail !== undefined) updateData.businessEmail = data.businessEmail;
  if (data.businessAddress !== undefined) updateData.businessAddress = data.businessAddress;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.pinCode !== undefined) updateData.pinCode = data.pinCode;
  if (data.zone !== undefined) updateData.zone = data.zone;
  if (data.panNumber !== undefined)
    updateData.panNumber = data.panNumber ? encrypt(data.panNumber) : null;
  if (data.nameAsPerPan !== undefined) updateData.nameAsPerPan = data.nameAsPerPan;
  if (data.incorporationDate !== undefined) updateData.incorporationDate = data.incorporationDate;
  if (data.gstStatus !== undefined) updateData.gstStatus = data.gstStatus;
  if (data.merchantCategory !== undefined) updateData.merchantCategory = data.merchantCategory;
  if (data.annualTurnover !== undefined) updateData.annualTurnover = data.annualTurnover;
  if (data.operatingCountry !== undefined) updateData.operatingCountry = data.operatingCountry;
  if (data.numberOfEmployees !== undefined) updateData.numberOfEmployees = data.numberOfEmployees;

  // new bank fields
  if (data.bankAccountType !== undefined) updateData.bankAccountType = data.bankAccountType;
  if (data.bankAccountName !== undefined)
    updateData.bankAccountName = data.bankAccountName
      ? encrypt(data.bankAccountName)
      : null;

  const merchant = await prisma.merchant.update({
    where: { id: Number(id) },
    data: updateData,
  });

  const changes = {};
  if (data.merchantName !== undefined) changes.name = data.merchantName;
  if (data.email !== undefined) changes.email = data.email;
  if (data.status !== undefined) changes.status = data.status;
  if (data.businessName !== undefined) changes.businessName = data.businessName;
  if (data.gstin !== undefined) changes.gstin = "updated";
  if (data.accountNumber !== undefined) changes.accountNumber = "updated";
  if (data.ifscCode !== undefined) changes.ifscCode = "updated";
  await auditLogService.logMerchantUpdated(
    null,
    merchant.id,
    merchant.name,
    changes,
  );

  return {
    id: merchant.id,
    merchantName: merchant.name,
    email: merchant.email,
    phone: merchant.phone,
    webhookUrl: merchant.webhookUrl,
    webhookSecret: merchant.webhookSecret,
    businessName: merchant.businessName,
    websiteUrl: merchant.websiteUrl,
    businessType: merchant.businessType,
    gstin: merchant.gstin ? decrypt(merchant.gstin) : null,
    bankName: merchant.bankName,
    accountNumber: merchant.accountNumber
      ? decrypt(merchant.accountNumber)
      : null,
    ifscCode: merchant.ifscCode ? decrypt(merchant.ifscCode) : null,
    settlementCurrency: merchant.settlementCurrency,
    status: merchant.status,
    isActive: merchant.isActive,
    paymentMethods: merchant.paymentMethods,

    contactPerson: merchant.contactPerson,
    businessPhone: merchant.businessPhone,
    businessEmail: merchant.businessEmail,
    businessAddress: merchant.businessAddress,
    city: merchant.city,
    state: merchant.state,
    pinCode: merchant.pinCode,
    zone: merchant.zone,
    panNumber: merchant.panNumber ? decrypt(merchant.panNumber) : null,
    nameAsPerPan: merchant.nameAsPerPan,
    incorporationDate: merchant.incorporationDate,
    gstStatus: merchant.gstStatus,
    merchantCategory: merchant.merchantCategory,
    annualTurnover: merchant.annualTurnover,
    operatingCountry: merchant.operatingCountry,
    numberOfEmployees: merchant.numberOfEmployees,
    bankAccountType: merchant.bankAccountType,
    bankAccountName: merchant.bankAccountName
      ? decrypt(merchant.bankAccountName)
      : null,

    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
  };
};

// DELETE (soft)
const deleteMerchant = async (id) => {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
  });
  if (!existingMerchant) throw new Error("Merchant not found");

  const merchant = await prisma.merchant.update({
    where: { id: Number(id) },
    data: { status: "INACTIVE", isActive: false },
  });

  await auditLogService.log({
    action: "MERCHANT_DELETED",
    resource: "Merchant",
    userId: null,
    resourceId: existingMerchant.id,
    description: `Merchant ${existingMerchant.name} deactivated`,
    status: "SUCCESS",
    details: {
      merchantId: existingMerchant.id,
      merchantName: existingMerchant.name,
    },
  });

  return {
    success: true,
    message: "Merchant deactivated successfully",
    data: {
      id: merchant.id,
      merchantName: merchant.name,
      status: merchant.status,
    },
  };
};

// HARD DELETE
const hardDeleteMerchant = async (id) => {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
  });
  if (!existingMerchant) throw new Error("Merchant not found");

  return prisma.merchant.delete({
    where: { id: Number(id) },
  });
};

// STATS
const getMerchantStats = async () => {
  const totalMerchants = await prisma.merchant.count();
  const activeMerchants = await prisma.merchant.count({
    where: { status: "ACTIVE" },
  });
  const pendingMerchants = await prisma.merchant.count({
    where: { status: "PENDING" },
  });
  const inactiveMerchants = await prisma.merchant.count({
    where: { status: "REJECTED" },
  });
  const businessTypes = await prisma.merchant.groupBy({
    by: ["businessType"],
  });

  return {
    totalMerchants,
    activeMerchants,
    pendingMerchants,
    inactiveMerchants,
    businessTypes: businessTypes.length,
  };
};

// SUMMARY
const getMerchantSummary = async (id) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      webhookUrl: true,
      webhookSecret: true,
      businessName: true,
      websiteUrl: true,
      businessType: true,
      gstin: true,
      bankName: true,
      accountNumber: true,
      ifscCode: true,
      ipWhitelist: true,
      clientSecret: true,
      settlementCurrency: true,
      status: true,
      paymentMethods: true,
      planType: true,
      bulkUploadEnabled: true,

      contactPerson: true,
      businessPhone: true,
      businessEmail: true,
      businessAddress: true,
      city: true,
      state: true,
      pinCode: true,
      zone: true,
      panNumber: true,
      nameAsPerPan: true,
      incorporationDate: true,
      gstStatus: true,
      merchantCategory: true,
      annualTurnover: true,
      operatingCountry: true,
      numberOfEmployees: true,
      bankAccountType: true,
      bankAccountName: true,

      users: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (!merchant) return null;

  return {
    id: merchant.id,
    merchantName: merchant.name,
    email: merchant.email,
    phone: merchant.phone,
    webhookUrl: merchant.webhookUrl,
    webhookSecret: merchant.webhookSecret,
    businessName: merchant.businessName,
    websiteUrl: merchant.websiteUrl,
    businessType: merchant.businessType,
    gstin: merchant.gstin ? decrypt(merchant.gstin) : null,
    bankName: merchant.bankName,
    accountNumber: merchant.accountNumber
      ? decrypt(merchant.accountNumber)
      : null,
    ifscCode: merchant.ifscCode ? decrypt(merchant.ifscCode) : null,
    ipWhitelist: merchant.ipWhitelist
      ? decryptIpList(merchant.ipWhitelist)
      : [],
    clientSecret: merchant.clientSecret ? decrypt(merchant.clientSecret) : null,
    settlementCurrency: merchant.settlementCurrency,
    status: merchant.status,
    paymentMethods: merchant.paymentMethods,
    planType: merchant.planType || "BASIC",
    bulkUploadEnabled: merchant.bulkUploadEnabled,

    contactPerson: merchant.contactPerson,
    businessPhone: merchant.businessPhone,
    businessEmail: merchant.businessEmail,
    businessAddress: merchant.businessAddress,
    city: merchant.city,
    state: merchant.state,
    pinCode: merchant.pinCode,
    zone: merchant.zone,
    panNumber: merchant.panNumber ? decrypt(merchant.panNumber) : null,
    nameAsPerPan: merchant.nameAsPerPan,
    incorporationDate: merchant.incorporationDate,
    gstStatus: merchant.gstStatus,
    merchantCategory: merchant.merchantCategory,
    annualTurnover: merchant.annualTurnover,
    operatingCountry: merchant.operatingCountry,
    numberOfEmployees: merchant.numberOfEmployees,
    bankAccountType: merchant.bankAccountType,
    bankAccountName: merchant.bankAccountName
      ? decrypt(merchant.bankAccountName)
      : null,

    users: merchant.users,
  };
};

// ========== IP WHITELIST ==========
const getWhitelistedIps = async (merchantId) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
    select: { ipWhitelist: true },
  });
  if (!merchant) throw new Error("Merchant not found");
  const decryptedIps = merchant.ipWhitelist
    ? decryptIpList(merchant.ipWhitelist)
    : [];
  return { ips: decryptedIps };
};

const addIpToWhitelist = async (merchantId, ipAddress) => {
  if (!ipAddress || typeof ipAddress !== "string" || ipAddress.trim() === "") {
    throw new Error("Valid IP address is required");
  }
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });
  if (!merchant) throw new Error("Merchant not found");

  const currentIps = merchant.ipWhitelist
    ? decryptIpList(merchant.ipWhitelist)
    : [];
  if (currentIps.includes(ipAddress)) {
    throw new Error("IP address already whitelisted");
  }
  const updatedIps = [...currentIps, ipAddress];
  const encryptedIps = encryptIpList(updatedIps);

  await prisma.merchant.update({
    where: { id: Number(merchantId) },
    data: { ipWhitelist: encryptedIps },
  });

  await auditLogService.log({
    action: "IP_WHITELIST_ADDED",
    resource: "Merchant",
    userId: null,
    merchantId: merchantId,
    description: `IP ${ipAddress} added to whitelist for merchant ${merchantId}`,
    status: "SUCCESS",
    details: { ipAddress, merchantId },
  });

  return { ip: ipAddress, message: "IP added successfully" };
};

const updateIpInWhitelist = async (merchantId, oldIp, newIp) => {
  if (!oldIp || typeof oldIp !== "string" || oldIp.trim() === "") {
    throw new Error("Valid old IP address is required");
  }
  if (!newIp || typeof newIp !== "string" || newIp.trim() === "") {
    throw new Error("Valid new IP address is required");
  }
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });
  if (!merchant) throw new Error("Merchant not found");

  const currentIps = merchant.ipWhitelist
    ? decryptIpList(merchant.ipWhitelist)
    : [];
  if (!currentIps.includes(oldIp)) throw new Error("IP address not found");
  if (currentIps.includes(newIp))
    throw new Error("New IP address already whitelisted");

  const updatedIps = currentIps.map((ip) => (ip === oldIp ? newIp : ip));
  const encryptedIps = encryptIpList(updatedIps);

  await prisma.merchant.update({
    where: { id: Number(merchantId) },
    data: { ipWhitelist: encryptedIps },
  });

  await auditLogService.log({
    action: "IP_WHITELIST_UPDATED",
    resource: "Merchant",
    userId: null,
    merchantId: merchantId,
    description: `IP ${oldIp} updated to ${newIp} for merchant ${merchantId}`,
    status: "SUCCESS",
    details: { oldIp, newIp, merchantId },
  });

  return { oldIp, newIp, message: "IP updated successfully" };
};

const deleteIpFromWhitelist = async (merchantId, ipAddress) => {
  if (!ipAddress || typeof ipAddress !== "string" || ipAddress.trim() === "") {
    throw new Error("Valid IP address is required");
  }
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });
  if (!merchant) throw new Error("Merchant not found");

  const currentIps = merchant.ipWhitelist
    ? decryptIpList(merchant.ipWhitelist)
    : [];
  if (!currentIps.includes(ipAddress)) throw new Error("IP address not found");

  const updatedIps = currentIps.filter((ip) => ip !== ipAddress);
  const encryptedIps = encryptIpList(updatedIps);

  await prisma.merchant.update({
    where: { id: Number(merchantId) },
    data: { ipWhitelist: encryptedIps },
  });

  await auditLogService.log({
    action: "IP_WHITELIST_DELETED",
    resource: "Merchant",
    userId: null,
    merchantId: merchantId,
    description: `IP ${ipAddress} removed from whitelist for merchant ${merchantId}`,
    status: "SUCCESS",
    details: { ipAddress, merchantId },
  });

  return { ip: ipAddress, message: "IP deleted successfully" };
};

// ========== WEBHOOK FORMAT ==========
const getWebhookConfig = async (merchantId) => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
    select: { id: true, name: true, webhookUrl: true, webhookConfig: true },
  });
  if (!merchant) throw new Error("Merchant not found");
  return {
    id: merchant.id,
    merchantName: merchant.name,
    webhookUrl: merchant.webhookUrl,
    webhookConfig: merchant.webhookConfig,
    usingDefault: !merchant.webhookConfig,
  };
};

const updateWebhookConfig = async (merchantId, config) => {
  const existing = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });
  if (!existing) throw new Error("Merchant not found");

  if (config !== null) {
    const check = validateWebhookConfig(config);
    if (!check.valid) throw new Error(check.errors.join("; "));
  }

  const merchant = await prisma.merchant.update({
    where: { id: Number(merchantId) },
    data: { webhookConfig: config === null ? Prisma.DbNull : config },
  });

  await auditLogService.log({
    action: "MERCHANT_WEBHOOK_CONFIG_UPDATED",
    resource: "Merchant",
    userId: null,
    merchantId: merchant.id,
    description:
      config === null
        ? `Webhook format reset to default for merchant ${merchant.name}`
        : `Webhook format updated for merchant ${merchant.name}`,
    status: "SUCCESS",
    details: { merchantId: merchant.id, usingDefault: config === null },
  });

  return {
    id: merchant.id,
    merchantName: merchant.name,
    webhookConfig: merchant.webhookConfig,
    usingDefault: config === null,
  };
};

const previewWebhookConfig = (config) => previewWebhook(config);

const getWebhookFormatOptions = () => ({
  sources: getAllowedSources(),
  statuses: getAllowedStatuses(),
});

// APPROVE MERCHANT
const approveMerchant = async (id) => {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
  });
  if (!existingMerchant) throw new Error("Merchant not found");
  if (existingMerchant.status !== "PENDING")
    throw new Error("Only pending merchants can be approved");

  const merchant = await prisma.merchant.update({
    where: { id: Number(id) },
    data: { status: "ACTIVE", isActive: true },
  });

  await auditLogService.log({
    action: "MERCHANT_APPROVED",
    resource: "Merchant",
    userId: null,
    resourceId: merchant.id,
    description: `Merchant ${merchant.name} approved`,
    status: "SUCCESS",
    details: { merchantId: merchant.id, merchantName: merchant.name },
  });

  return {
    success: true,
    message: "Merchant approved successfully",
    data: {
      id: merchant.id,
      merchantName: merchant.name,
      status: merchant.status,
    },
  };
};

// REJECT MERCHANT
const rejectMerchant = async (id) => {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id: Number(id) },
  });
  if (!existingMerchant) throw new Error("Merchant not found");
  if (existingMerchant.status !== "PENDING")
    throw new Error("Only pending merchants can be rejected");

  const merchant = await prisma.merchant.update({
    where: { id: Number(id) },
    data: { status: "REJECTED", isActive: false },
  });

  await auditLogService.log({
    action: "MERCHANT_REJECTED",
    resource: "Merchant",
    userId: null,
    resourceId: merchant.id,
    description: `Merchant ${merchant.name} rejected`,
    status: "SUCCESS",
    details: { merchantId: merchant.id, merchantName: merchant.name },
  });

  return {
    success: true,
    message: "Merchant rejected",
    data: {
      id: merchant.id,
      merchantName: merchant.name,
      status: merchant.status,
    },
  };
};

module.exports = {
  createMerchant,
  approveMerchant,
  rejectMerchant,
  getAllMerchants,
  getMerchantById,
  updateMerchant,
  deleteMerchant,
  hardDeleteMerchant,
  getMerchantStats,
  assignUserToMerchant,
  removeUserFromMerchant,
  getMerchantSummary,
  getWhitelistedIps,
  addIpToWhitelist,
  updateIpInWhitelist,
  deleteIpFromWhitelist,
  getWebhookConfig,
  updateWebhookConfig,
  previewWebhookConfig,
  getWebhookFormatOptions,
};