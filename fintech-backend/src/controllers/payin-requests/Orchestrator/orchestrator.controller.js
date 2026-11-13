const prisma = require("../../../../config/prisma");
const paymentOrchestrator = require("./orchestrator.service");

class OrchestratorController {
  /**
   * Configure merchant routing strategy
   */
  async configureRouting(req, res) {
    try {
      const { merchantId } = req.params;
      const { routingStrategy, config } = req.body;

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant ID is required" });
      }

      if (!routingStrategy) {
        return res.status(400).json({ error: "Routing strategy is required" });
      }

      // Configure routing
      const result = await paymentOrchestrator.configureMerchantRouting(
        parseInt(merchantId),
        { routingStrategy, ...config },
      );

      return res.json({
        success: true,
        message: `Routing configured with strategy: ${routingStrategy}`,
        data: result,
      });
    } catch (error) {
      console.error("[OrchestratorController] Configuration error:", error);
      return res.status(500).json({
        error: "Failed to configure routing",
        details: error.message,
      });
    }
  }

  /**
   * Set gateway priorities for merchant
   */
  async setGatewayPriorities(req, res) {
    try {
      const { merchantId } = req.params;
      const { gateways } = req.body;

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant ID is required" });
      }

      if (!Array.isArray(gateways) || gateways.length === 0) {
        return res
          .status(400)
          .json({ error: "Gateways array is required and cannot be empty" });
      }

      // Validate gateway structure
      for (let i = 0; i < gateways.length; i++) {
        if (!gateways[i].gatewayId) {
          return res.status(400).json({
            error: `Gateway at index ${i} is missing gatewayId`,
          });
        }
      }

      // Set priorities
      const result = await paymentOrchestrator.setGatewayPriority(
        parseInt(merchantId),
        gateways,
      );

      return res.json({
        success: true,
        message: "Gateway priorities configured successfully",
        data: result,
      });
    } catch (error) {
      console.error("[OrchestratorController] Priority error:", error);
      return res.status(500).json({
        error: "Failed to set gateway priorities",
        details: error.message,
      });
    }
  }

  /**
   * Get merchant routing preferences
   */
  async getRoutingPreferences(req, res) {
    try {
      const { merchantId } = req.params;

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant ID is required" });
      }

      const prefs = await prisma.merchantRoutingPreference.findUnique({
        where: { merchantId: parseInt(merchantId) },
        include: {
          priorityGateways: {
            include: { gateway: true },
            orderBy: { priority: "asc" },
          },
        },
      });

      return res.json({
        success: true,
        data: prefs,
      });
    } catch (error) {
      console.error("[OrchestratorController] Get preferences error:", error);
      return res.status(500).json({
        error: "Failed to fetch routing preferences",
        details: error.message,
      });
    }
  }

  /**
   * Get gateway health metrics
   */
  async getGatewayHealth(req, res) {
    try {
      const { gatewayId } = req.params;

      if (!gatewayId) {
        return res.status(400).json({ error: "Gateway ID is required" });
      }

      const health = await paymentOrchestrator.getGatewayHealth(
        parseInt(gatewayId),
      );

      if (!health) {
        return res.status(404).json({ error: "Gateway not found" });
      }

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error("[OrchestratorController] Health check error:", error);
      return res.status(500).json({
        error: "Failed to fetch gateway health",
        details: error.message,
      });
    }
  }

  /**
   * Get all gateways health metrics
   * GET /api/orchestrator/health
   */
  async getAllGatewayHealth(req, res) {
    try {
      const stats = await prisma.gatewayStats.findMany({
        include: { gateway: true },
      });

      const healthData = stats.map((stat) => ({
        gatewayId: stat.gatewayId,
        name: stat.gateway.name,
        successRate: stat.successRate,
        totalRequests: stat.totalRequests,
        successfulRequests: stat.successfulRequests,
        failedRequests: stat.failedRequests,
        averageResponseTime: stat.averageResponseTime,
        averageSuccessTime: stat.averageSuccessTime,
        isHealthy: stat.successRate > 90,
      }));

      return res.json({
        success: true,
        data: healthData,
      });
    } catch (error) {
      console.error("[OrchestratorController] All health check error:", error);
      return res.status(500).json({
        error: "Failed to fetch gateway health metrics",
        details: error.message,
      });
    }
  }

  /**
   * Configure load balancing weights
   */
  async configureLoadBalancing(req, res) {
    try {
      const { merchantId } = req.params;
      const { weights } = req.body;

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant ID is required" });
      }

      if (!weights || typeof weights !== "object") {
        return res
          .status(400)
          .json({ error: "Valid weights object is required" });
      }

      // Validate weights sum to 100
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      if (sum !== 100) {
        return res.status(400).json({
          error: `Weights must sum to 100. Current sum: ${sum}`,
        });
      }

      const result = await paymentOrchestrator.configureMerchantRouting(
        parseInt(merchantId),
        {
          routingStrategy: "LOAD_BALANCE",
          loadBalancingConfig: weights,
        },
      );

      return res.json({
        success: true,
        message: "Load balancing configured successfully",
        data: result,
      });
    } catch (error) {
      console.error(
        "[OrchestratorController] Load balancing config error:",
        error,
      );
      return res.status(500).json({
        error: "Failed to configure load balancing",
        details: error.message,
      });
    }
  }

  /**
   * Configure payment mode preferences
   */
  async configurePaymentModes(req, res) {
    try {
      const { merchantId } = req.params;
      const { preferences } = req.body;

      if (!merchantId) {
        return res.status(400).json({ error: "Merchant ID is required" });
      }

      if (!preferences || typeof preferences !== "object") {
        return res
          .status(400)
          .json({ error: "Valid preferences object is required" });
      }

      const result = await paymentOrchestrator.configureMerchantRouting(
        parseInt(merchantId),
        {
          paymentModePreferences: preferences,
        },
      );

      return res.json({
        success: true,
        message: "Payment mode preferences configured successfully",
        data: result,
      });
    } catch (error) {
      console.error(
        "[OrchestratorController] Payment mode config error:",
        error,
      );
      return res.status(500).json({
        error: "Failed to configure payment mode preferences",
        details: error.message,
      });
    }
  }

  /**
   * Get gateway failure logs for debugging
   */
  async getFailureLogs(req, res) {
    try {
      const { payInRequestId } = req.params;

      if (!payInRequestId) {
        return res.status(400).json({ error: "Pay-in request ID is required" });
      }

      const logs = await prisma.gatewayFailureLog.findMany({
        where: { payInRequestId: parseInt(payInRequestId) },
        include: { gateway: true },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      console.error("[OrchestratorController] Get failures error:", error);
      return res.status(500).json({
        error: "Failed to fetch failure logs",
        details: error.message,
      });
    }
  }

  /**
   * Get routing analytics/dashboard
   */
  async getAnalytics(req, res) {
    try {
      // Get gateway statistics
      const gateways = await prisma.gatewayStats.findMany({
        include: { gateway: true },
      });

      // Get merchant routing strategies count
      const strategies = await prisma.merchantRoutingPreference.groupBy({
        by: ["routingStrategy"],
        _count: true,
      });

      // Get recent failures
      const recentFailures = await prisma.gatewayFailureLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        groupBy: ["gatewayId"],
        _count: true,
      });

      return res.json({
        success: true,
        data: {
          gateways: gateways.map((g) => ({
            id: g.gatewayId,
            name: g.gateway.name,
            successRate: g.successRate,
            totalRequests: g.totalRequests,
            isHealthy: g.successRate > 90,
          })),
          strategies: strategies.map((s) => ({
            strategy: s.routingStrategy,
            merchantCount: s._count,
          })),
          recentFailures,
        },
      });
    } catch (error) {
      console.error("[OrchestratorController] Analytics error:", error);
      return res.status(500).json({
        error: "Failed to fetch analytics",
        details: error.message,
      });
    }
  }
}

module.exports = new OrchestratorController();
