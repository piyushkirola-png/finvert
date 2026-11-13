const settlementService = require("./settlements.service.js");
const { Parser } = require("json2csv");
const prisma = require("../../../config/prisma");

class SettlementController {
  /**
   * GET /settlements
   */
  async getSettlements(req, res) {
    try {
      const { page = 1, limit = 10, status, merchantId } = req.query;

      let effectiveMerchantId = merchantId;
      if (req.user.role === "USER") {
        effectiveMerchantId = req.user.merchantId;

        // If they try to pass a different merchantId, override it
        if (merchantId && parseInt(merchantId) !== req.user.merchantId) {
          console.warn(
            `Merchant ${req.user.id} tried to access merchant ${merchantId} - overriding`,
          );
        }
      }

      const result = await settlementService.getSettlements(
        parseInt(page),
        parseInt(limit),
        status,
        effectiveMerchantId,
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Get settlements error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch settlements",
      });
    }
  }

  /**
   * Get single settlement by ID
   */
  async getSettlementById(req, res) {
    try {
      const { id } = req.params;

      const settlement = await settlementService.getSettlementById(id);

      res.json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      console.error("Get settlement by ID error:", error);
      res.status(404).json({
        success: false,
        message: error.message || "Settlement not found",
      });
    }
  }

  /**
   * Get merchant settlement summary
   */
  async getMerchantSettlementSummary(req, res) {
    try {
      const { merchantId } = req.params;
      const { userId } = req.query;

      // Get payin wallet balance (Available Balance)
      const payInWallet = await prisma.payInWallet.findFirst({
        where: {
          merchantId: parseInt(merchantId),
          userId: userId ? parseInt(userId) : undefined,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get pending settlements (Unsettled Amount)
      const pendingSettlements = await prisma.settlement.aggregate({
        where: {
          merchantId: parseInt(merchantId),
          userId: userId ? parseInt(userId) : undefined,
          status: "PENDING",
        },
        _sum: { amount: true },
      });

      // Get payout wallet balance
      const payOutWallet = await prisma.payOutWallet.findFirst({
        where: {
          merchantId: parseInt(merchantId),
          userId: userId ? parseInt(userId) : undefined,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get merchant details for name
      const merchant = await prisma.merchant.findUnique({
        where: { id: parseInt(merchantId) },
        select: { name: true, businessName: true },
      });

      res.json({
        success: true,
        data: {
          merchantId: parseInt(merchantId),
          merchantName: merchant?.name || `Merchant ${merchantId}`,
          availableBalance: payInWallet?.closingBalance || 0,
          unsettledAmount: pendingSettlements._sum.amount || 0,
          payoutBalance: payOutWallet?.closingBalance || 0,
        },
      });
    } catch (error) {
      console.error("Get merchant settlement summary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch merchant settlement summary",
      });
    }
  }

  /**
   * Create a new settlement request (Wallet Settlement)
   */
  async createSettlement(req, res) {
    try {
      const { merchantId, userId, amount, notes } = req.body;
      const adminId = req.user?.id;
      const userRole = req.user?.role;

      // Validation
      if (!merchantId || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Merchant ID and valid amount are required",
        });
      }

      let settlement;

      // ROLE-BASED LOGIC
      if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
        settlement = await settlementService.createInstantSettlement(
          parseInt(merchantId),
          parseInt(userId),
          parseFloat(amount),
          adminId,
          notes || `Instant settlement of ₹${amount} by admin`,
        );

        res.status(201).json({
          success: true,
          message: "Settlement completed successfully",
          data: settlement,
        });
      } else {
        settlement = await settlementService.createSettlement(
          parseInt(merchantId),
          parseInt(userId),
          parseFloat(amount),
          adminId,
          notes || `Settlement requested by ${req.user?.fullName || "USER"}`,
        );

        res.status(201).json({
          success: true,
          message:
            "Settlement request created successfully. Awaiting approval.",
          data: settlement,
        });
      }
    } catch (error) {
      console.error("Create settlement error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create settlement",
      });
    }
  }

  /**
   * Manual credit to payout wallet
   */
  async manualCreditPayout(req, res) {
    try {
      const { merchantId, userId, amount, notes } = req.body;
      const adminId = req.user?.id;

      if (!merchantId || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Merchant ID and valid amount are required",
        });
      }

      const settlement = await settlementService.manualCreditPayout(
        parseInt(merchantId),
        parseInt(userId),
        parseFloat(amount),
        adminId,
        notes || `Manual credit payout of ₹${amount}`,
      );

      res.status(201).json({
        success: true,
        message: "Manual credit payout completed successfully",
        data: settlement,
      });
    } catch (error) {
      console.error("Manual credit payout error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process credit payout",
      });
    }
  }

  /**
   * Manual debit from payin wallet
   */
  async manualDebitPayIn(req, res) {
    try {
      const { merchantId, userId, amount, notes } = req.body;
      const adminId = req.user?.id;

      if (!merchantId || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Merchant ID and valid amount are required",
        });
      }

      const settlement = await settlementService.manualDebitPayIn(
        parseInt(merchantId),
        parseInt(userId),
        parseFloat(amount),
        adminId,
        notes || `Manual debit payin of ₹${amount}`,
      );

      res.status(201).json({
        success: true,
        message: "Manual debit payin completed successfully",
        data: settlement,
      });
    } catch (error) {
      console.error("Manual debit payin error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process debit payin",
      });
    }
  }

  /**
   * Approve a pending settlement
   */
  async approveSettlement(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      const settlement = await settlementService.approveSettlement(id, adminId);
      await notificationService.notifySettlementApproved(
        settlement,
        settlement.merchantId,
      );

      res.json({
        success: true,
        message: "Settlement approved successfully",
        data: settlement,
      });
    } catch (error) {
      console.error("Approve settlement error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve settlement",
      });
    }
  }

  /**
   * Reject a pending settlement
   */
  async rejectSettlement(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;

      const settlement = await settlementService.rejectSettlement(
        id,
        adminId,
        reason,
      );

      res.json({
        success: true,
        message: "Settlement rejected successfully",
        data: settlement,
      });
    } catch (error) {
      console.error("Reject settlement error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reject settlement",
      });
    }
  }

  /**
   * Process a settlement
   */
  async processSettlement(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      const settlement = await settlementService.processSettlement(id, adminId);
      await notificationService.notifySettlementCompleted(
        settlement,
        settlement.merchantId,
      );

      res.json({
        success: true,
        message: "Settlement processed successfully",
        data: settlement,
      });
    } catch (error) {
      console.error("Process settlement error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process settlement",
      });
    }
  }

  /**
   * Export settlements to CSV
   */
  async exportSettlements(req, res) {
    try {
      const { status, merchantId, startDate, endDate } = req.query;

      // Build filters
      const filters = [];
      if (status && status !== "All") {
        filters.push({ property: "status", operator: "eq", value: status });
      }
      if (merchantId) {
        filters.push({
          property: "merchantId",
          operator: "eq",
          value: parseInt(merchantId),
        });
      }

      // Apply merchant filter for MERCHANT role
      if (req.user.role === "USER") {
        if (!req.user.merchantId) {
          return res.status(403).json({ error: "No merchant associated" });
        }
        filters.push({
          property: "merchantId",
          operator: "eq",
          value: req.user.merchantId,
        });
      }

      // Call the CSV export service
      const csvExportService = require("../csv-export/csv-export.service");
      const result = await csvExportService.requestCsvExport(
        req.user,
        "SETTLEMENTS",
        {
          startDate: startDate || null,
          endDate: endDate || null,
          filters: filters,
        },
      );

      res.status(202).json({
        success: true,
        message:
          "Export is being processed. You can download it from Transaction Reports.",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Export settlements error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to export settlements",
      });
    }
  }

  /**
   * Get settlement summary statistics
   */
  async getSettlementSummary(req, res) {
    try {
      const [
        totalSettlements,
        pendingApprovals,
        completedSettlements,
        totalAmount,
      ] = await Promise.all([
        client.settlement.count(),
        client.settlement.count({ where: { approvalStatus: "PENDING" } }),
        client.settlement.count({ where: { status: "COMPLETED" } }),
        client.settlement.aggregate({
          where: { status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalSettlements,
          pendingApprovals,
          completedSettlements,
          totalSettledAmount: totalAmount._sum.amount || 0,
        },
      });
    } catch (error) {
      console.error("Get settlement summary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch summary",
      });
    }
  }
}

module.exports = new SettlementController();
