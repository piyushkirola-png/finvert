const prisma = require("../../../config/prisma");

// GET ALL MAPPINGS
const getAllMappings = async (filters = {}) => {
  const {
    status,
    gatewayId,
    merchantId,
    search,
    limit = 100,
    offset = 0,
  } = filters;

  const where = {};

  if (status && status !== "all") where.status = status;
  if (gatewayId && gatewayId !== "all") where.gatewayId = Number(gatewayId);
  if (merchantId && merchantId !== "all") where.merchantId = Number(merchantId);

  if (search) {
    where.OR = [
      { gateway: { name: { contains: search, mode: "insensitive" } } },
      { merchant: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const mappings = await prisma.gatewayMerchantMapping.findMany({
    where,
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: Number(limit),
    skip: Number(offset),
  });

  const total = await prisma.gatewayMerchantMapping.count({ where });

  return {
    data: mappings.map((item) => ({
      id: item.id,
      gatewayId: item.gatewayId,
      gatewayName: item.gateway?.name || null,
      merchantId: item.merchantId,
      merchantName: item.merchant?.name || null,
      status: item.status,
      assignedAt: item.assignedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    total,
  };
};

// GET MAPPINGS BY GATEWAY
const getMappingsByGateway = async (gatewayId) => {
  const mappings = await prisma.gatewayMerchantMapping.findMany({
    where: {
      gatewayId: Number(gatewayId),
    },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return mappings.map((item) => ({
    id: item.id,
    gatewayId: item.gatewayId,
    gatewayName: item.gateway?.name || null,
    merchantId: item.merchantId,
    merchantName: item.merchant?.name || null,
    status: item.status,
    assignedAt: item.assignedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

// GET MAPPINGS BY MERCHANT
const getMappingsByMerchant = async (merchantId) => {
  const mappings = await prisma.gatewayMerchantMapping.findMany({
    where: {
      merchantId: Number(merchantId),
    },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return mappings.map((item) => ({
    id: item.id,
    gatewayId: item.gatewayId,
    gatewayName: item.gateway?.name || null,
    merchantId: item.merchantId,
    merchantName: item.merchant?.name || null,
    status: item.status,
    assignedAt: item.assignedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

// GET SINGLE MAPPING BY ID
const getMappingById = async (id) => {
  const mapping = await prisma.gatewayMerchantMapping.findUnique({
    where: { id: Number(id) },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!mapping) return null;

  return {
    id: mapping.id,
    gatewayId: mapping.gatewayId,
    gatewayName: mapping.gateway?.name || null,
    merchantId: mapping.merchantId,
    merchantName: mapping.merchant?.name || null,
    status: mapping.status,
    assignedAt: mapping.assignedAt,
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
  };
};

/**
 * CREATE new gateway-merchant mapping
 */
const createMapping = async (data) => {
  const { gatewayId, merchantId, status = "ACTIVE" } = data;

  // Validate: Check if gateway exists
  const gateway = await prisma.gateway.findUnique({
    where: { id: Number(gatewayId) },
  });

  if (!gateway) {
    throw new Error("Gateway not found");
  }

  // Validate: Check if merchant exists
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  // Validate: Check if mapping already exists
  const existing = await prisma.gatewayMerchantMapping.findFirst({
    where: {
      gatewayId: Number(gatewayId),
      merchantId: Number(merchantId),
    },
  });

  if (existing) {
    throw new Error("This gateway is already mapped to this merchant");
  }

  // Create mapping
  const mapping = await prisma.gatewayMerchantMapping.create({
    data: {
      gatewayId: Number(gatewayId),
      merchantId: Number(merchantId),
      status: status || "ACTIVE",
      assignedAt: new Date(),
    },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: mapping.id,
    gatewayId: mapping.gatewayId,
    gatewayName: mapping.gateway?.name || null,
    merchantId: mapping.merchantId,
    merchantName: mapping.merchant?.name || null,
    status: mapping.status,
    assignedAt: mapping.assignedAt,
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
  };
};

/**
 * UPDATE mapping status
 */
const updateMapping = async (id, data) => {
  const { status } = data;

  // Validate: Check if mapping exists
  const existing = await prisma.gatewayMerchantMapping.findUnique({
    where: { id: Number(id) },
  });

  if (!existing) {
    throw new Error("Mapping not found");
  }

  // Update mapping
  const mapping = await prisma.gatewayMerchantMapping.update({
    where: { id: Number(id) },
    data: {
      status: status || existing.status,
      updatedAt: new Date(),
    },
    include: {
      gateway: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: mapping.id,
    gatewayId: mapping.gatewayId,
    gatewayName: mapping.gateway?.name || null,
    merchantId: mapping.merchantId,
    merchantName: mapping.merchant?.name || null,
    status: mapping.status,
    assignedAt: mapping.assignedAt,
    createdAt: mapping.createdAt,
    updatedAt: mapping.updatedAt,
  };
};

/**
 * DELETE mapping
 */
const deleteMapping = async (id) => {
  // Validate: Check if mapping exists
  const existing = await prisma.gatewayMerchantMapping.findUnique({
    where: { id: Number(id) },
  });

  if (!existing) {
    throw new Error("Mapping not found");
  }

  // Delete mapping
  await prisma.gatewayMerchantMapping.delete({
    where: { id: Number(id) },
  });

  return { id: Number(id), deleted: true };
};

/**
 * BULK CREATE mappings
 */
const bulkCreateMappings = async (data) => {
  const { merchantId, gatewayIds, status = "ACTIVE" } = data;

  // Validate merchant
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  const results = [];
  const errors = [];

  for (const gatewayId of gatewayIds) {
    try {
      const result = await createMapping({
        gatewayId: Number(gatewayId),
        merchantId: Number(merchantId),
        status,
      });
      results.push(result);
    } catch (error) {
      errors.push({ gatewayId, error: error.message });
    }
  }

  return { results, errors };
};

module.exports = {
  getAllMappings,
  getMappingsByGateway,
  getMappingsByMerchant,
  getMappingById,
  createMapping,
  updateMapping,
  deleteMapping,
  bulkCreateMappings,
};
