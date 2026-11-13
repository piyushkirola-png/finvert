const prisma = require("../../../../config/prisma");

class PaymentOrchestrator {
  /**
   * Main router: Decides which gateway to use for a payment
   */
  async decideRoute(routeContext) {
    const {
      merchantId,
      amount,
      paymentMode,
      currency = "INR",
      country = "IN",
      riskLevel = "LOW",
      currentUser,
      excludeGateways = [],
    } = routeContext;

    try {
      // Step 1: Get merchant routing preference
      const merchantPref = await this.getMerchantRoutingPreference(merchantId);

      // Step 2: Apply routing strategy
      let selectedGateway = null;

      switch (merchantPref?.routingStrategy) {
        case "PRIORITY":
          selectedGateway = await this.priorityRouting(
            merchantId,
            merchantPref,
            paymentMode,
            routeContext,
            excludeGateways,
          );
          break;

        case "FAILOVER":
          selectedGateway = await this.failoverRouting(
            merchantId,
            merchantPref,
            paymentMode,
            routeContext,
            excludeGateways,
          );
          break;

        case "LOAD_BALANCE":
          selectedGateway = await this.loadBalancingRouting(
            merchantPref,
            paymentMode,
            routeContext,
            excludeGateways,
          );
          break;

        case "HYBRID":
        default:
          selectedGateway = await this.priorityRouting(
            merchantId,
            merchantPref,
            paymentMode,
            routeContext,
            excludeGateways,
          );

          if (!selectedGateway) {
            selectedGateway = await this.successRateRouting(
              merchantId,
              merchantPref,
              paymentMode,
              routeContext,
              excludeGateways,
            );
          }
      }

      // Step 3: Only HYBRID strategy gets fallback
      if (!selectedGateway && merchantPref?.routingStrategy === "HYBRID") {
        selectedGateway = await this.successRateRouting(
          merchantId,
          merchantPref,
          paymentMode,
          routeContext,
          excludeGateways,
        );
      }

      // Step 4: If still no gateway, use payment mode routing
      if (!selectedGateway) {
        selectedGateway = await this.paymentModeRouting(
          merchantId,
          paymentMode,
          routeContext,
          excludeGateways,
        );
      }

      // Step 5: Validate gateway
      if (!selectedGateway) {
        throw new Error("No suitable gateway found for routing");
      }

      // Log routing decision
      await this.logRoutingDecision({
        merchantId,
        selectedGatewayId: selectedGateway.id,
        strategy: merchantPref?.routingStrategy || "DEFAULT",
        amount,
        paymentMode,
        context: routeContext,
      });

      return selectedGateway;
    } catch (error) {
      console.error("[PaymentOrchestrator] Routing failed:", error);
      throw error;
    }
  }

  /**
   * Strategy 1: Priority Routing
   * Routes to merchant's preferred gateways in priority order
   */
  async priorityRouting(
    merchantId,
    merchantPref,
    paymentMode,
    context,
    excludeGateways = [],
  ) {
    // Get merchant's priority list
    const priorityList = await prisma.merchantGatewayPriority.findMany({
      where: {
        merchantRoutingPrefId: merchantPref?.id,
        isActive: true,
        gatewayId: { notIn: excludeGateways },
      },
      orderBy: { priority: "asc" },
      include: { gateway: true },
    });

    const { amount } = context;

    // Try gateways in priority order
    for (const priority of priorityList) {
      if (excludeGateways.includes(priority.gatewayId)) {
        console.log(
          `[Priority] Skipping ${priority.gateway.name} (already tried)`,
        );
        continue;
      }

      // 1. Check if gateway supports payment mode
      let paymentModesArray = priority.paymentModes;
      if (typeof paymentModesArray === "string") {
        try {
          if (paymentModesArray.startsWith("{")) {
            paymentModesArray = paymentModesArray
              .replace(/[{}]/g, "")
              .split(",");
          } else {
            paymentModesArray = JSON.parse(paymentModesArray);
          }
        } catch (e) {
          paymentModesArray = [];
        }
      }

      if (
        paymentModesArray.length > 0 &&
        !paymentModesArray.includes(paymentMode)
      ) {
        console.log(
          `[Priority] ${priority.gateway.name} doesn't support ${paymentMode}`,
        );
        continue;
      }

      // 2. Check if gateway is active
      if (!priority.gateway.isActive) {
        console.log(`[Priority] ${priority.gateway.name} is inactive`);
        continue;
      }

      // 4. Check if merchant is mapped to this gateway
      const mapping = await prisma.gatewayMerchantMapping.findFirst({
        where: {
          gatewayId: priority.gateway.id,
          merchantId: merchantId,
          status: "ACTIVE",
        },
      });

      if (!mapping) {
        console.log(
          `[Priority] ${priority.gateway.name} not mapped to merchant ${merchantId}`,
        );
        continue;
      }

      // All checks passed - return this gateway
      console.log(
        `[Priority] SELECTED: ${priority.gateway.name} (Priority ${priority.priority})`,
      );
      return priority.gateway;
    }

    // If no priority list, try preferred gateway
    if (merchantPref?.preferredGatewayId) {
      const gateway = await prisma.gateway.findUnique({
        where: { id: merchantPref.preferredGatewayId },
      });
      if (gateway?.isActive) {
        console.log(`[Priority] SELECTED preferred: ${gateway.name}`);
        return gateway;
      }
    }

    console.log(
      `[Priority] No eligible gateway found for ${paymentMode} ₹${amount}`,
    );
    return null;
  }

  /**
   * Strategy 2: Payment Mode Routing
   */
  async paymentModeRouting(
    merchantId,
    paymentMode,
    context,
    excludeGateways = [],
  ) {
    const { amount } = context;

    // 1. Get merchant's routing preference
    const merchantPref = await this.getMerchantRoutingPreference(merchantId);

    // Check if merchant has payment mode preferences (custom mapping)
    if (
      merchantPref?.paymentModePreferences &&
      merchantPref.paymentModePreferences[paymentMode]
    ) {
      const preferredGatewayId =
        merchantPref.paymentModePreferences[paymentMode];
      const gateway = await prisma.gateway.findUnique({
        where: { id: preferredGatewayId },
      });

      // Verify gateway is active
      if (gateway?.isActive) {
        return gateway;
      }
    }

    // 2. Get merchant's priority list (sorted by priority)
    const pref = await this.getMerchantRoutingPreference(merchantId);

    if (!pref) {
      console.log(
        `[PaymentMode] No routing preference found for merchant ${merchantId}`,
      );
      return null;
    }

    const priorityList = await prisma.merchantGatewayPriority.findMany({
      where: {
        merchantRoutingPrefId: pref.id,
        isActive: true,
        gatewayId: { notIn: excludeGateways },
      },
      orderBy: { priority: "asc" },
      include: {
        gateway: true,
      },
    });

    if (priorityList.length === 0) {
      console.log(
        `[PaymentMode] No priority gateways found for merchant ${merchantId}`,
      );
      return null;
    }

    console.log(
      `[PaymentMode] Checking ${priorityList.length} gateways for ${paymentMode}`,
    );

    // 3. Loop through each gateway in priority order
    for (const priority of priorityList) {
      const gateway = priority.gateway;

      if (excludeGateways.includes(gateway.id)) {
        console.log(`[PaymentMode] Skipping ${gateway.name} (already tried)`);
        continue;
      }

      // Check 1: Does gateway support this payment mode?
      let paymentModesArray = priority.paymentModes;
      if (typeof paymentModesArray === "string") {
        try {
          if (paymentModesArray.startsWith("{")) {
            paymentModesArray = paymentModesArray
              .replace(/[{}]/g, "")
              .split(",");
          } else {
            paymentModesArray = JSON.parse(paymentModesArray);
          }
        } catch (e) {
          paymentModesArray = [];
        }
      }

      if (!paymentModesArray.includes(paymentMode)) {
        console.log(
          `[PaymentMode] ${gateway.name} doesn't support ${paymentMode}`,
        );
        continue;
      }

      // Check 2: Is gateway active?
      if (!gateway.isActive) {
        console.log(`[PaymentMode] ${gateway.name} is inactive`);
        continue;
      }

      // Check 3: Is merchant mapped to this gateway?
      const mapping = await prisma.gatewayMerchantMapping.findFirst({
        where: {
          gatewayId: gateway.id,
          merchantId: merchantId,
          status: "ACTIVE",
        },
      });

      if (!mapping) {
        console.log(
          `[PaymentMode] ${gateway.name} not mapped to merchant ${merchantId}`,
        );
        continue;
      }

      console.log(
        `[PaymentMode] SELECTED: ${gateway.name} for ${paymentMode} (Priority ${priority.priority})`,
      );
      return gateway;
    }

    // 4. FINAL FALLBACK: Try any gateway with pricing for this payment mode
    console.log(
      `[PaymentMode] No eligible gateway found in priority list for ${paymentMode}`,
    );

    return null;
  }

  /**
   * Strategy 3: Success Rate Routing
   */
  async successRateRouting(
    merchantId,
    merchantPref,
    paymentMode,
    context,
    excludeGateways = [],
  ) {
    const availableGateways = await prisma.gatewayMerchantMapping.findMany({
      where: {
        merchantId: merchantId,
        status: "ACTIVE",
        gatewayId: { notIn: excludeGateways },
      },
      include: {
        gateway: {
          include: { stats: true },
        },
      },
    });

    if (availableGateways.length === 0) {
      return null;
    }

    const sorted = availableGateways
      .filter((m) => m.gateway.isActive)
      .sort((a, b) => {
        const rateA = a.gateway.stats?.successRate || 0;
        const rateB = b.gateway.stats?.successRate || 0;
        return rateB - rateA;
      });

    return sorted.length > 0 ? sorted[0].gateway : null;
  }

  /**
   * Strategy 4: Failover Routing
   */
  async failoverRouting(
    merchantId,
    merchantPref,
    paymentMode,
    context,
    excludeGateways = [],
  ) {
    const priorityList = await prisma.merchantGatewayPriority.findMany({
      where: {
        merchantRoutingPrefId: merchantPref.id,
        enableFailover: true,
        isActive: true,
        gatewayId: { notIn: excludeGateways },
      },
      orderBy: { priority: "asc" },
      include: { gateway: true },
    });

    const { amount } = context;

    for (const priority of priorityList) {
      if (excludeGateways.includes(priority.gatewayId)) {
        console.log(
          `[Failover] Skipping ${priority.gateway.name} (already tried)`,
        );
        continue;
      }

      // 1. Check payment mode support
      if (
        priority.paymentModes.length > 0 &&
        !priority.paymentModes.includes(paymentMode)
      ) {
        console.log(
          `[Failover] ${priority.gateway.name} doesn't support ${paymentMode}`,
        );
        continue;
      }
      
      // 3. Check if gateway is active
      if (!priority.gateway.isActive) {
        console.log(`[Failover] ${priority.gateway.name} is inactive`);
        continue;
      }

      // 4. Check if merchant is mapped
      const mapping = await prisma.gatewayMerchantMapping.findFirst({
        where: {
          gatewayId: priority.gateway.id,
          merchantId: merchantId,
          status: "ACTIVE",
        },
      });

      if (!mapping) {
        console.log(
          `[Failover] ${priority.gateway.name} not mapped to merchant ${merchantId}`,
        );
        continue;
      }

      console.log(`[Failover] SELECTED: ${priority.gateway.name}`);
      return priority.gateway;
    }

    return null;
  }

  /**
   * Strategy 5: Load Balancing Routing
   */
  async loadBalancingRouting(
    merchantPref,
    paymentMode,
    context,
    excludeGateways = [],
  ) {
    if (!merchantPref?.loadBalancingConfig) {
      return null;
    }

    const config = merchantPref.loadBalancingConfig;
    const gatewayIds = Object.keys(config);
    const weights = Object.values(config);

    if (gatewayIds.length === 0) {
      return null;
    }

    const random = Math.random() * 100;
    let cumulative = 0;

    for (let i = 0; i < gatewayIds.length; i++) {
      const gatewayId = parseInt(gatewayIds[i]);

      if (excludeGateways.includes(gatewayId)) {
        console.log(
          `[LoadBalance] Skipping gateway ${gatewayId} (already tried)`,
        );
        continue;
      }

      cumulative += weights[i];
      if (random <= cumulative) {
        const gateway = await prisma.gateway.findUnique({
          where: { id: gatewayId },
        });
        if (gateway?.isActive) {
          return gateway;
        }
      }
    }

    return null;
  }

  /**
   * Get merchant routing preference
   */
  async getMerchantRoutingPreference(merchantId) {
    let pref = await prisma.merchantRoutingPreference.findUnique({
      where: { merchantId },
    });

    if (!pref) {
      pref = await prisma.merchantRoutingPreference.create({
        data: {
          merchantId,
          routingStrategy: "HYBRID",
        },
      });
    }

    return pref;
  }

  /**
   * Update gateway stats
   */
  async updateGatewayStats(gatewayId, isSuccess, responseTime = 0) {
    const stats = await prisma.gatewayStats.findUnique({
      where: { gatewayId },
    });

    if (!stats) {
      await prisma.gatewayStats.create({
        data: {
          gatewayId,
          totalRequests: 1,
          successfulRequests: isSuccess ? 1 : 0,
          failedRequests: isSuccess ? 0 : 1,
          successRate: isSuccess ? 100 : 0,
          averageResponseTime: responseTime,
          averageSuccessTime: isSuccess ? responseTime : 0,
        },
      });
    } else {
      const totalRequests = stats.totalRequests + 1;
      const successfulRequests = isSuccess
        ? stats.successfulRequests + 1
        : stats.successfulRequests;
      const failedRequests = isSuccess
        ? stats.failedRequests
        : stats.failedRequests + 1;
      const successRate = (successfulRequests / totalRequests) * 100;
      const newAvgResponseTime =
        (stats.averageResponseTime * stats.totalRequests + responseTime) /
        totalRequests;

      await prisma.gatewayStats.update({
        where: { gatewayId },
        data: {
          totalRequests,
          successfulRequests,
          failedRequests,
          successRate,
          averageResponseTime: newAvgResponseTime,
        },
      });
    }
  }

  /**
   * Log failure
   */
  async logFailure(payInRequestId, gatewayId, errorDetails, attemptNumber = 1) {
    await prisma.gatewayFailureLog.create({
      data: {
        payInRequestId,
        gatewayId,
        errorCode: errorDetails?.code,
        errorMessage: errorDetails?.message,
        failureReason: errorDetails?.reason,
        attemptNumber,
        retryable: this.isRetryableError(errorDetails?.code),
      },
    });
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(errorCode) {
    const nonRetryableErrors = [
      "INVALID_AMOUNT",
      "INVALID_CUSTOMER",
      "MERCHANT_NOT_ACTIVE",
      "GATEWAY_DISABLED",
      "MERCHANT_DISABLED",
    ];
    return !nonRetryableErrors.includes(errorCode);
  }

  /**
   * Log routing decision
   */
  async logRoutingDecision(routingData) {
    console.log(
      `[Routing] Merchant: ${routingData.merchantId}, Gateway: ${routingData.selectedGatewayId}, Strategy: ${routingData.strategy}`,
    );
  }

  /**
   * Get gateway health
   */
  async getGatewayHealth(gatewayId) {
    const stats = await prisma.gatewayStats.findUnique({
      where: { gatewayId },
      include: { gateway: true },
    });
    if (!stats) return null;
    return {
      gatewayId,
      name: stats.gateway.name,
      successRate: stats.successRate,
      totalRequests: stats.totalRequests,
      averageResponseTime: stats.averageResponseTime,
      isHealthy: stats.successRate > 90,
    };
  }

  /**
   * Configure merchant routing
   */
  async configureMerchantRouting(merchantId, config) {
    const {
      routingStrategy,
      preferredGatewayId,
      loadBalancingConfig,
      paymentModePreferences,
      riskLevel,
      restrictedGateways,
    } = config;

    const pref = await prisma.merchantRoutingPreference.upsert({
      where: { merchantId },
      create: {
        merchantId,
        routingStrategy: routingStrategy || "HYBRID",
        preferredGatewayId,
        loadBalancingConfig,
        paymentModePreferences,
        riskLevel,
        restrictedGateways,
      },
      update: {
        routingStrategy,
        preferredGatewayId,
        loadBalancingConfig,
        paymentModePreferences,
        riskLevel,
        restrictedGateways,
      },
    });
    return pref;
  }

  /**
   * Set gateway priority
   */
  async setGatewayPriority(merchantId, gateways) {
    const pref = await this.getMerchantRoutingPreference(merchantId);

    await prisma.merchantGatewayPriority.deleteMany({
      where: { merchantRoutingPrefId: pref.id },
    });

    for (let i = 0; i < gateways.length; i++) {
      await prisma.merchantGatewayPriority.create({
        data: {
          merchantRoutingPrefId: pref.id,
          gatewayId: gateways[i].gatewayId,
          priority: i + 1,
          paymentModes: gateways[i].paymentModes || [],
          enableFailover: gateways[i].enableFailover !== false,
          maxRetries: gateways[i].maxRetries || 3,
        },
      });
    }
    return pref;
  }
}

module.exports = new PaymentOrchestrator();
