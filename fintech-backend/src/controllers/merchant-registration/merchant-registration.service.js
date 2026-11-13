const prisma = require("../../../config/prisma");
const crypto = require("crypto");
const { encrypt } = require("../../utils/encryption.util");

// Generate random secret key
const generateSecretKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

// REGISTER MERCHANT (PUBLIC)
const registerMerchant = async (data) => {
  // Validate required fields
  if (!data.merchantName) {
    throw new Error("Merchant name is required");
  }
  if (!data.email) {
    throw new Error("Email is required");
  }
  if (!data.businessName) {
    throw new Error("Business name is required");
  }
  if (!data.businessType) {
    throw new Error("Business type is required");
  }

  // Check if merchant already exists
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
  const onboardingToken = crypto.randomBytes(16).toString("hex");

  const encryptedGstin = data.gstin ? encrypt(data.gstin) : null;
  const encryptedAccountNumber = data.accountNumber
    ? encrypt(data.accountNumber)
    : null;
  const encryptedIfscCode = data.ifscCode ? encrypt(data.ifscCode) : null;

  return prisma.merchant.create({
    data: {
      name: data.merchantName,
      email: data.email,
      phone: data.phone || null,
      isActive: false,
      status: "PENDING",
      secretKey: secretKey,
      clientId: clientId,
      clientSecret: clientSecret,
      webhookUrl: data.webhookUrl || null,
      webhookSecret: data.webhookSecret || null,
      businessName: data.businessName,
      websiteUrl: data.websiteUrl || null,
      businessType: data.businessType,
      gstin: encryptedGstin,
      bankName: data.bankName || null,
      accountNumber: encryptedAccountNumber,
      ifscCode: encryptedIfscCode,
      settlementCurrency: data.settlementCurrency || "INR",
      paymentMethods: data.paymentMethods || [],
      onboardingToken: onboardingToken,
    },
  });
};

// VALIDATE ONBOARDING TOKEN
const validateToken = async (token) => {
  const merchant = await prisma.merchant.findFirst({
    where: { onboardingToken: token },
  });

  if (!merchant) {
    throw new Error("Invalid or expired registration link");
  }

  return {
    valid: true,
    merchantId: merchant.id,
    status: merchant.status,
  };
};

module.exports = {
  registerMerchant,
  validateToken,
};
