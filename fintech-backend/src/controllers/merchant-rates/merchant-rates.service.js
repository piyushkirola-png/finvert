const prisma = require("../../../config/prisma");

// Helper function to validate min/max amounts
const validateMinMaxAmounts = (minAmount, maxAmount) => {
  if (
    minAmount !== null &&
    minAmount !== undefined &&
    maxAmount !== null &&
    maxAmount !== undefined &&
    Number(minAmount) > Number(maxAmount)
  ) {
    throw new Error(
      `Min amount (${minAmount}) cannot be greater than max amount (${maxAmount})`,
    );
  }
  return true;
};

// Helper function to convert direction
const convertDirection = (direction) => {
  const directionMap = {
    PAYIN: "PAY_IN",
    PAYOUT: "PAY_OUT",
    PAY_IN: "PAY_IN",
    PAY_OUT: "PAY_OUT",
    payin: "PAY_IN",
    payout: "PAY_OUT",
  };
  return directionMap[direction] || "PAY_IN";
};

// Helper function to convert rate type
const convertRateType = (rateType) => {
  const rateTypeMap = {
    FIXED: "FIXED",
    PERCENTAGE: "PERCENTAGE",
    fixed: "FIXED",
    percentage: "PERCENTAGE",
  };
  return rateTypeMap[rateType] || "FIXED";
};

const getMerchantRates = async (merchantId) => {
  const rates = await prisma.merchantRate.findMany({
    where: {
      merchantId: Number(merchantId),
    },
    include: {
      gateway: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform to frontend format (add direction alias)
  return rates.map((rate) => ({
    ...rate,
    direction: rate.rateDirection === "PAY_IN" ? "PAYIN" : "PAYOUT",
  }));
};

const createMerchantRate = async (data) => {
  // Validate min/max amounts
  validateMinMaxAmounts(data.minAmount, data.maxAmount);

  // Prepare data with correct field names
  const rateData = {
    merchantId: Number(data.merchantId),
    gatewayId: Number(data.gatewayId),
    rateDirection: convertDirection(data.direction),
    rateType: convertRateType(data.rateType),
    rateValue: Number(data.rateValue),
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  // Add optional fields only if they exist
  if (data.minAmount && data.minAmount !== "0" && data.minAmount !== "") {
    rateData.minAmount = Number(data.minAmount);
  }
  if (data.maxAmount && data.maxAmount !== "0" && data.maxAmount !== "") {
    rateData.maxAmount = Number(data.maxAmount);
  }
  if (data.taxRate && data.taxRate !== "0" && data.taxRate !== "") {
    rateData.taxRate = Number(data.taxRate);
  }

  const newRate = await prisma.merchantRate.create({
    data: rateData,
    include: {
      gateway: true,
      merchant: true,
    },
  });

  // Transform response to frontend format
  return {
    ...newRate,
    direction: newRate.rateDirection === "PAY_IN" ? "PAYIN" : "PAYOUT",
  };
};

const updateMerchantRate = async (id, data) => {
  // Validate min/max amounts
  validateMinMaxAmounts(data.minAmount, data.maxAmount);

  // Prepare update data
  const updateData = {
    gatewayId: Number(data.gatewayId),
    rateDirection: convertDirection(data.direction),
    rateType: convertRateType(data.rateType),
    rateValue: Number(data.rateValue),
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  // Add optional fields only if they exist
  if (data.minAmount && data.minAmount !== "0" && data.minAmount !== "") {
    updateData.minAmount = Number(data.minAmount);
  } else {
    updateData.minAmount = null;
  }

  if (data.maxAmount && data.maxAmount !== "0" && data.maxAmount !== "") {
    updateData.maxAmount = Number(data.maxAmount);
  } else {
    updateData.maxAmount = null;
  }

  if (data.taxRate && data.taxRate !== "0" && data.taxRate !== "") {
    updateData.taxRate = Number(data.taxRate);
  } else {
    updateData.taxRate = null;
  }

  const updatedRate = await prisma.merchantRate.update({
    where: {
      id: Number(id),
    },
    data: updateData,
    include: {
      gateway: true,
      merchant: true,
    },
  });

  // Transform response to frontend format
  return {
    ...updatedRate,
    direction: updatedRate.rateDirection === "PAY_IN" ? "PAYIN" : "PAYOUT",
  };
};

const deleteMerchantRate = async (id) => {
  // Check if rate exists
  const existingRate = await prisma.merchantRate.findUnique({
    where: { id: Number(id) },
  });
  if (!existingRate) throw new Error("Rate not found");

  return await prisma.merchantRate.delete({
    where: {
      id: Number(id),
    },
  });
};

module.exports = {
  getMerchantRates,
  createMerchantRate,
  updateMerchantRate,
  deleteMerchantRate,
};
