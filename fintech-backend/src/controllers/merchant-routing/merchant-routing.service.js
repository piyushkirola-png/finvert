const prisma = require("../../../config/prisma");

// Helper function to convert strategy
const convertStrategy = (strategy) => {
  const strategyMap = {
    priority: "PRIORITY",
    failover: "FAILOVER",
    load_balance: "LOAD_BALANCE",
    hybrid: "HYBRID",
    PRIORITY: "PRIORITY",
    FAILOVER: "FAILOVER",
    LOAD_BALANCE: "LOAD_BALANCE",
    HYBRID: "HYBRID",
  };
  return strategyMap[strategy?.toUpperCase()] || "PRIORITY";
};

// Helper function to convert risk level
const convertRiskLevel = (risk) => {
  const riskMap = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
  };
  return riskMap[risk?.toUpperCase()] || "LOW";
};

// Helper function to validate and merge priorities
const validateAndMergePriorities = (priorities) => {
  if (!priorities || priorities.length === 0) {
    throw new Error("At least one gateway priority is required");
  }

  // Check for duplicate gateways
  const gatewayMap = new Map();

  for (const p of priorities) {
    if (!p.gatewayId) {
      throw new Error("Gateway ID is required for all priorities");
    }

    const gatewayId = Number(p.gatewayId);

    if (gatewayMap.has(gatewayId)) {
      // Merge payment modes if same gateway appears
      const existing = gatewayMap.get(gatewayId);
      const existingModes = existing.paymentModes || [];
      const newModes = p.paymentModes || [];
      const mergedModes = [...new Set([...existingModes, ...newModes])];

      // Keep the highest priority (lowest number) and best retries
      existing.paymentModes = mergedModes;
      existing.priority = Math.min(existing.priority, p.priority || 1);
      existing.maxRetries = Math.max(existing.maxRetries, p.maxRetries || 3);
      existing.enableFailover = existing.enableFailover || p.enableFailover;
    } else {
      gatewayMap.set(gatewayId, {
        gatewayId: gatewayId,
        priority: p.priority || 1,
        paymentModes: p.paymentModes || [],
        enableFailover:
          p.enableFailover !== undefined ? p.enableFailover : true,
        maxRetries: p.maxRetries || 3,
        isActive: p.isActive !== undefined ? p.isActive : true,
      });
    }
  }

  // Convert map to array and sort by priority
  const mergedPriorities = Array.from(gatewayMap.values())
    .map((p) => ({
      ...p,
      paymentModes: [...new Set(p.paymentModes)], // Remove duplicate modes
    }))
    .sort((a, b) => a.priority - b.priority);

  // Re-assign priority numbers based on sorted order
  mergedPriorities.forEach((p, index) => {
    p.priority = index + 1;
  });

  // Validate each priority has at least one payment mode
  for (const p of mergedPriorities) {
    if (!p.paymentModes || p.paymentModes.length === 0) {
      throw new Error(
        `Gateway ${p.gatewayId} must have at least one payment mode`,
      );
    }
    if (p.maxRetries < 1) {
      throw new Error(
        `Max retries must be at least 1 for gateway ${p.gatewayId}`,
      );
    }
  }

  return mergedPriorities;
};

// CREATE
const createMerchantRouting = async (data) => {
  const {
    merchantId,
    routingStrategy,
    preferredGatewayId,
    loadBalancingConfig,
    riskLevel,
    restrictedGateways,
    isActive,
    priorities,
  } = data;

  // Validate required fields
  if (!merchantId) {
    throw new Error("Merchant ID is required");
  }

  // Check if merchant exists
  const merchant = await prisma.merchant.findUnique({
    where: { id: Number(merchantId) },
  });
  if (!merchant) {
    throw new Error("Merchant not found");
  }

  // Check if routing already exists for this merchant
  const existing = await prisma.merchantRoutingPreference.findUnique({
    where: { merchantId: Number(merchantId) },
  });
  if (existing) {
    throw new Error(
      `Routing configuration already exists for merchant #${merchantId}`,
    );
  }

  // Validate and merge priorities
  const mergedPriorities = validateAndMergePriorities(priorities);

  // Validate load balancing config
  if (routingStrategy === "LOAD_BALANCE" && loadBalancingConfig) {
    const total = Object.values(loadBalancingConfig).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (Math.abs(total - 100) > 0.01) {
      throw new Error("Load balancing weights must sum to 100%");
    }
  }

  // Validate preferred gateway
  if (preferredGatewayId) {
    const gateway = await prisma.gateway.findUnique({
      where: { id: Number(preferredGatewayId) },
    });
    if (!gateway) {
      throw new Error(`Preferred gateway ${preferredGatewayId} not found`);
    }
    if (
      restrictedGateways &&
      restrictedGateways.includes(Number(preferredGatewayId))
    ) {
      throw new Error("Preferred gateway cannot be restricted");
    }
  }

  // Validate restricted gateways vs priorities
  if (restrictedGateways && restrictedGateways.length > 0) {
    const priorityGatewayIds = mergedPriorities.map((p) => p.gatewayId);
    const conflicting = restrictedGateways.filter((id) =>
      priorityGatewayIds.includes(id),
    );
    if (conflicting.length > 0) {
      throw new Error(
        `Gateways ${conflicting.join(", ")} cannot be both restricted and in priorities`,
      );
    }
  }

  // Create routing preference
  const routingPreference = await prisma.merchantRoutingPreference.create({
    data: {
      merchantId: Number(merchantId),
      routingStrategy: convertStrategy(routingStrategy),
      preferredGatewayId: preferredGatewayId
        ? Number(preferredGatewayId)
        : null,
      loadBalancingConfig: loadBalancingConfig || {},
      riskLevel: convertRiskLevel(riskLevel),
      restrictedGateways: restrictedGateways || [],
      isActive: isActive !== undefined ? isActive : true,
    },
  });

  // Create priorities
  let createdPriorities = [];
  if (mergedPriorities.length > 0) {
    const priorityData = mergedPriorities.map((p) => ({
      merchantRoutingPrefId: routingPreference.id,
      gatewayId: Number(p.gatewayId),
      priority: p.priority || 1,
      paymentModes: p.paymentModes || [],
      enableFailover: p.enableFailover !== undefined ? p.enableFailover : true,
      maxRetries: p.maxRetries || 3,
      isActive: p.isActive !== undefined ? p.isActive : true,
    }));

    createdPriorities = await prisma.$transaction(
      priorityData.map((p) =>
        prisma.merchantGatewayPriority.create({
          data: p,
          include: {
            gateway: true,
          },
        }),
      ),
    );
  }

  // Fetch the complete record with relations
  return await getMerchantRoutingById(routingPreference.id);
};

// GET ALL
const getAllMerchantRouting = async () => {
  const routing = await prisma.merchantRoutingPreference.findMany({
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      priorityGateways: {
        include: {
          gateway: true,
        },
        orderBy: {
          priority: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return routing.map((item) => ({
    id: item.id,
    merchantId: item.merchantId,
    merchantName: item.merchant?.name || `Merchant #${item.merchantId}`,
    routingStrategy: item.routingStrategy,
    preferredGatewayId: item.preferredGatewayId,
    loadBalancingConfig: item.loadBalancingConfig,
    riskLevel: item.riskLevel,
    restrictedGateways: item.restrictedGateways,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    priorities: item.priorityGateways.map((p) => ({
      id: p.id,
      merchantRoutingPrefId: p.merchantRoutingPrefId,
      gatewayId: p.gatewayId,
      gatewayName: p.gateway?.gateway_name || `Gateway #${p.gatewayId}`,
      priority: p.priority,
      paymentModes: p.paymentModes,
      enableFailover: p.enableFailover,
      maxRetries: p.maxRetries,
      isActive: p.isActive,
    })),
  }));
};

// GET BY ID
const getMerchantRoutingById = async (id) => {
  const routing = await prisma.merchantRoutingPreference.findUnique({
    where: { id: Number(id) },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      priorityGateways: {
        include: {
          gateway: true,
        },
        orderBy: {
          priority: "asc",
        },
      },
    },
  });

  if (!routing) return null;

  return {
    id: routing.id,
    merchantId: routing.merchantId,
    merchantName: routing.merchant?.name || `Merchant #${routing.merchantId}`,
    routingStrategy: routing.routingStrategy,
    preferredGatewayId: routing.preferredGatewayId,
    loadBalancingConfig: routing.loadBalancingConfig,
    riskLevel: routing.riskLevel,
    restrictedGateways: routing.restrictedGateways,
    isActive: routing.isActive,
    createdAt: routing.createdAt,
    updatedAt: routing.updatedAt,
    priorities: routing.priorityGateways.map((p) => ({
      id: p.id,
      merchantRoutingPrefId: p.merchantRoutingPrefId,
      gatewayId: p.gatewayId,
      gatewayName: p.gateway?.gateway_name || `Gateway #${p.gatewayId}`,
      priority: p.priority,
      paymentModes: p.paymentModes,
      enableFailover: p.enableFailover,
      maxRetries: p.maxRetries,
      isActive: p.isActive,
    })),
  };
};

// GET BY MERCHANT
const getMerchantRoutingByMerchant = async (merchantId) => {
  const routing = await prisma.merchantRoutingPreference.findUnique({
    where: { merchantId: Number(merchantId) },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      priorityGateways: {
        include: {
          gateway: true,
        },
        orderBy: {
          priority: "asc",
        },
      },
    },
  });

  if (!routing) return null;

  return {
    id: routing.id,
    merchantId: routing.merchantId,
    merchantName: routing.merchant?.name || `Merchant #${routing.merchantId}`,
    routingStrategy: routing.routingStrategy,
    preferredGatewayId: routing.preferredGatewayId,
    loadBalancingConfig: routing.loadBalancingConfig,
    riskLevel: routing.riskLevel,
    restrictedGateways: routing.restrictedGateways,
    isActive: routing.isActive,
    createdAt: routing.createdAt,
    updatedAt: routing.updatedAt,
    priorities: routing.priorityGateways.map((p) => ({
      id: p.id,
      merchantRoutingPrefId: p.merchantRoutingPrefId,
      gatewayId: p.gatewayId,
      gatewayName: p.gateway?.gateway_name || `Gateway #${p.gatewayId}`,
      priority: p.priority,
      paymentModes: p.paymentModes,
      enableFailover: p.enableFailover,
      maxRetries: p.maxRetries,
      isActive: p.isActive,
    })),
  };
};

// UPDATE
const updateMerchantRouting = async (id, data) => {
  const {
    merchantId,
    routingStrategy,
    preferredGatewayId,
    loadBalancingConfig,
    riskLevel,
    restrictedGateways,
    isActive,
    priorities,
  } = data;

  // Check if routing exists
  const existingRouting = await prisma.merchantRoutingPreference.findUnique({
    where: { id: Number(id) },
  });
  if (!existingRouting) {
    throw new Error("Merchant routing configuration not found");
  }

  // Validate merchant if provided
  if (merchantId !== undefined) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: Number(merchantId) },
    });
    if (!merchant) {
      throw new Error("Merchant not found");
    }
  }

  // Validate and merge priorities
  let mergedPriorities = null;
  if (priorities !== undefined) {
    mergedPriorities = validateAndMergePriorities(priorities);
  }

  // Validate load balancing config
  if (routingStrategy === "LOAD_BALANCE" && loadBalancingConfig) {
    const total = Object.values(loadBalancingConfig).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (Math.abs(total - 100) > 0.01) {
      throw new Error("Load balancing weights must sum to 100%");
    }
  }

  // Validate preferred gateway
  if (preferredGatewayId) {
    const gateway = await prisma.gateway.findUnique({
      where: { id: Number(preferredGatewayId) },
    });
    if (!gateway) {
      throw new Error(`Preferred gateway ${preferredGatewayId} not found`);
    }
    const restricted =
      restrictedGateways !== undefined
        ? restrictedGateways
        : existingRouting.restrictedGateways;
    if (restricted && restricted.includes(Number(preferredGatewayId))) {
      throw new Error("Preferred gateway cannot be restricted");
    }
  }

  // Validate restricted gateways vs priorities
  if (restrictedGateways && restrictedGateways.length > 0) {
    const finalPriorities =
      mergedPriorities || (await getPrioritiesForRouting(id));
    if (finalPriorities) {
      const priorityGatewayIds = finalPriorities.map((p) => p.gatewayId);
      const conflicting = restrictedGateways.filter((id) =>
        priorityGatewayIds.includes(id),
      );
      if (conflicting.length > 0) {
        throw new Error(
          `Gateways ${conflicting.join(", ")} cannot be both restricted and in priorities`,
        );
      }
    }
  }

  // Update routing preference
  const updateData = {};
  if (merchantId !== undefined) updateData.merchantId = Number(merchantId);
  if (routingStrategy !== undefined)
    updateData.routingStrategy = convertStrategy(routingStrategy);
  if (preferredGatewayId !== undefined)
    updateData.preferredGatewayId = preferredGatewayId
      ? Number(preferredGatewayId)
      : null;
  if (loadBalancingConfig !== undefined)
    updateData.loadBalancingConfig = loadBalancingConfig;
  if (riskLevel !== undefined)
    updateData.riskLevel = convertRiskLevel(riskLevel);
  if (restrictedGateways !== undefined)
    updateData.restrictedGateways = restrictedGateways;
  if (isActive !== undefined) updateData.isActive = isActive;

  await prisma.merchantRoutingPreference.update({
    where: { id: Number(id) },
    data: updateData,
  });

  // Update priorities if provided
  if (priorities !== undefined) {
    // Delete existing priorities
    await prisma.merchantGatewayPriority.deleteMany({
      where: { merchantRoutingPrefId: Number(id) },
    });

    // Create new priorities
    if (mergedPriorities && mergedPriorities.length > 0) {
      const priorityData = mergedPriorities.map((p) => ({
        merchantRoutingPrefId: Number(id),
        gatewayId: Number(p.gatewayId),
        priority: p.priority || 1,
        paymentModes: p.paymentModes || [],
        enableFailover:
          p.enableFailover !== undefined ? p.enableFailover : true,
        maxRetries: p.maxRetries || 3,
        isActive: p.isActive !== undefined ? p.isActive : true,
      }));

      await prisma.$transaction(
        priorityData.map((p) =>
          prisma.merchantGatewayPriority.create({
            data: p,
          }),
        ),
      );
    }
  }

  // Fetch and return updated record
  return await getMerchantRoutingById(id);
};

// Helper to get priorities for validation
const getPrioritiesForRouting = async (id) => {
  const priorities = await prisma.merchantGatewayPriority.findMany({
    where: { merchantRoutingPrefId: Number(id) },
    select: {
      gatewayId: true,
      priority: true,
      paymentModes: true,
      enableFailover: true,
      maxRetries: true,
      isActive: true,
    },
    orderBy: { priority: "asc" },
  });
  return priorities;
};

// DELETE
const deleteMerchantRouting = async (id) => {
  // Check if routing exists
  const existing = await prisma.merchantRoutingPreference.findUnique({
    where: { id: Number(id) },
    include: {
      priorityGateways: true,
    },
  });
  if (!existing) {
    throw new Error("Merchant routing configuration not found");
  }

  // Delete priorities first (cascade will handle if set, but explicit for safety)
  if (existing.priorityGateways.length > 0) {
    await prisma.merchantGatewayPriority.deleteMany({
      where: { merchantRoutingPrefId: Number(id) },
    });
  }

  // Delete routing preference
  await prisma.merchantRoutingPreference.delete({
    where: { id: Number(id) },
  });

  return { success: true };
};

module.exports = {
  createMerchantRouting,
  getAllMerchantRouting,
  getMerchantRoutingById,
  getMerchantRoutingByMerchant,
  updateMerchantRouting,
  deleteMerchantRouting,
};
