const { RiskBlockType } = require("@prisma/client");
const prisma = require("../../../config/prisma");

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  // Remove all non-digits
  let digits = String(phone).replace(/\D/g, "");

  if (digits.length === 0) return null;

  const hasCountryCode = (digits) => {
    const codes = [
      "91",
      "1",
      "44",
      "61",
      "81",
      "86",
      "49",
      "33",
      "39",
      "55",
      "971",
      "966",
    ];
    for (const code of codes) {
      if (digits.startsWith(code) && digits.length >= code.length + 7) {
        return true;
      }
    }
    return false;
  };

  if (hasCountryCode(digits)) {
    return digits;
  }

  if (digits.length === 10) {
    const firstDigit = digits.charAt(0);
    if (["6", "7", "8", "9"].includes(firstDigit)) {
      return `91${digits}`;
    }
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.substring(1);
  }

  return digits;
};

const normalizeEmail = (email) => {
  if (!email) return null;
  return String(email).trim().toLowerCase();
};

const normalizeCardDigits = (cardNumber) => {
  if (!cardNumber) return null;
  const digits = String(cardNumber).replace(/\D/g, "");
  return digits.length === 0 ? null : digits;
};

const normalizeValue = (type, value) => {
  if (value === undefined || value === null) return null;

  switch (type) {
    case RiskBlockType.USER_ID:
    case RiskBlockType.MERCHANT_ID:
      return String(Number(value));
    case RiskBlockType.EMAIL:
      return normalizeEmail(value);
    case RiskBlockType.PHONE_NUMBER:
      return normalizePhoneNumber(value);
    case RiskBlockType.CARD_BIN: {
      const digits = normalizeCardDigits(value);
      return digits && digits.length >= 6 ? digits.slice(0, 6) : null;
    }
    case RiskBlockType.CARD_LAST4: {
      const digits = normalizeCardDigits(value);
      return digits && digits.length >= 4 ? digits.slice(-4) : null;
    }
    case RiskBlockType.VPA:
      return String(value).trim().toLowerCase();
    case RiskBlockType.IP_ADDRESS:
      return String(value).trim();
    case RiskBlockType.DEVICE_ID:
      return String(value).trim();
    default:
      return String(value).trim();
  }
};

const buildQueryForPayment = ({
  user,
  customer,
  card,
  merchantId,
  vpa,
  deviceId,
  ipAddress,
}) => {
  const filters = [];
  if (user?.id) {
    filters.push({ type: RiskBlockType.USER_ID, value: String(user.id) });
  }
  if (merchantId) {
    filters.push({
      type: RiskBlockType.MERCHANT_ID,
      value: String(merchantId),
    });
  }
  if (user?.email) {
    filters.push({
      type: RiskBlockType.EMAIL,
      value: normalizeEmail(user.email),
    });
  }
  if (user?.phoneNumber) {
    filters.push({
      type: RiskBlockType.PHONE_NUMBER,
      value: normalizePhoneNumber(user.phoneNumber),
    });
  }
  if (customer?.email) {
    filters.push({
      type: RiskBlockType.EMAIL,
      value: normalizeEmail(customer.email),
    });
  }
  if (customer?.phone) {
    filters.push({
      type: RiskBlockType.PHONE_NUMBER,
      value: normalizePhoneNumber(customer.phone),
    });
  }
  if (card?.cardNumber) {
    const digits = normalizeCardDigits(card.cardNumber);
    if (digits) {
      if (digits.length >= 6) {
        filters.push({
          type: RiskBlockType.CARD_BIN,
          value: digits.slice(0, 6),
        });
      }
      filters.push({ type: RiskBlockType.CARD_LAST4, value: digits.slice(-4) });
    }
  }
  if (vpa) {
    filters.push({
      type: RiskBlockType.VPA,
      value: String(vpa).trim().toLowerCase(),
    });
  }
  if (deviceId) {
    filters.push({
      type: RiskBlockType.DEVICE_ID,
      value: String(deviceId).trim(),
    });
  }
  if (ipAddress) {
    filters.push({
      type: RiskBlockType.IP_ADDRESS,
      value: String(ipAddress).trim(),
    });
  }
  return filters.filter((filter) => filter.value !== null);
};

const createRiskBlock = async (data, createdByUserId = null) => {
  const normalizedValue = normalizeValue(data.type, data.value);
  if (!normalizedValue) {
    throw new Error("Invalid risk block value");
  }

  const existing = await prisma.riskBlock.findFirst({
    where: {
      type: data.type,
      value: normalizedValue,
      isActive: true,
    },
  });

  if (existing) {
    throw new Error("This risk block already exists");
  }

  return prisma.riskBlock.create({
    data: {
      type: data.type,
      value: normalizedValue,
      reason: data.reason || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: createdByUserId,
    },
  });
};

const permanentlyDeleteRiskBlock = async (id) => {
  const riskBlock = await prisma.riskBlock.findUnique({
    where: { id: Number(id) },
  });

  if (!riskBlock) {
    throw new Error("Risk block not found");
  }

  if (riskBlock.isActive) {
    throw new Error(
      "Cannot permanently delete an active risk block. Deactivate it first.",
    );
  }

  return prisma.riskBlock.delete({
    where: { id: Number(id) },
  });
};

const getRiskBlocks = async (query = {}) => {
  const where = {};

  if (query.type) {
    where.type = query.type;
  }
  if (query.value) {
    const normalized = normalizeValue(
      query.type || RiskBlockType.EMAIL,
      query.value,
    );
    if (normalized) {
      where.value = normalized;
    }
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  return prisma.riskBlock.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

const getRiskBlockById = async (id) => {
  const riskBlock = await prisma.riskBlock.findUnique({
    where: { id: Number(id) },
  });
  if (!riskBlock) {
    throw new Error("Risk block not found");
  }
  return riskBlock;
};

const updateRiskBlock = async (id, data) => {
  const existing = await getRiskBlockById(id);

  const updateData = {};
  if (data.type && data.type !== existing.type) {
    updateData.type = data.type;
  }
  if (data.value !== undefined && data.value !== null) {
    const normalizedValue = normalizeValue(
      data.type || existing.type,
      data.value,
    );
    if (!normalizedValue) {
      throw new Error("Invalid risk block value");
    }
    updateData.value = normalizedValue;
  }
  if (data.reason !== undefined) {
    updateData.reason = data.reason;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No valid fields to update");
  }

  return prisma.riskBlock.update({
    where: { id: Number(id) },
    data: updateData,
  });
};

// This function is now only for soft delete (deactivating)
const deleteRiskBlock = async (id) => {
  return prisma.riskBlock.update({
    where: { id: Number(id) },
    data: { isActive: false },
  });
};

const findMatchingBlockForPayment = async ({
  user,
  customer,
  card,
  merchantId,
  vpa,
  deviceId,
  ipAddress,
}) => {
  const filters = buildQueryForPayment({
    user,
    customer,
    card,
    merchantId,
    vpa,
    deviceId,
    ipAddress,
  });
  if (filters.length === 0) {
    return null;
  }

  const blocks = await prisma.riskBlock.findMany({
    where: { isActive: true, OR: filters },
  });

  return blocks.length > 0 ? blocks[0] : null;
};

const checkPayInRequestBlocked = async ({
  user,
  customer,
  card,
  merchantId,
  vpa,
  deviceId,
  ipAddress,
}) => {
  const block = await findMatchingBlockForPayment({
    user,
    customer,
    card,
    merchantId,
    vpa,
    deviceId,
    ipAddress,
  });
  if (block) {
    throw new Error(`Payment blocked by risk rule: ${block.type}`);
  }
};

module.exports = {
  RiskBlockType,
  createRiskBlock,
  getRiskBlocks,
  getRiskBlockById,
  updateRiskBlock,
  deleteRiskBlock,
  permanentlyDeleteRiskBlock,
  findMatchingBlockForPayment,
  checkPayInRequestBlocked,
};
