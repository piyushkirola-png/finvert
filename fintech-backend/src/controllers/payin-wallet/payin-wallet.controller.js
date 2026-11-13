const payinWalletService = require("./payin-wallet.service");
const prisma = require("../../../config/prisma");

class PayinWalletController {
  /**
   * Get all wallet transactions with filters
   */
  async getWalletTransactions(req, res) {
    try {
      let {
        offset,
        limit,
        type,
        merchantId,
        userId,
        transactionId,
        referenceId,
        search,
        amountMin,
        amountMax,
        startDate,
        endDate,
      } = req.query;

      // Force merchant to see only their data
      if (req.user && req.user.role === "USER") {
        if (!req.user.merchantId) {
          return res.status(403).json({
            success: false,
            message: "No merchant associated with this user",
          });
        }
        merchantId = req.user.merchantId;
        userId = req.user.id;
      }

      const result = await payinWalletService.getWalletTransactions({
        offset,
        limit,
        type,
        merchantId,
        userId,
        transactionId,
        referenceId,
        search,
        amountMin,
        amountMax,
        startDate,
        endDate,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getWalletTransactions controller:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching wallet transactions",
        error: error.message,
      });
    }
  }

  /**
   * Get wallet summary
   */
  async getWalletSummary(req, res) {
    try {
      let { merchantId } = req.query;
      let userId = null;

      // Force merchant to see only their data
      if (req.user && req.user.role === "USER") {
        if (!req.user.merchantId) {
          return res.status(403).json({
            success: false,
            message: "No merchant associated with this user",
          });
        }
        merchantId = req.user.merchantId;
        userId = req.user.id;
      }

      const result = await payinWalletService.getWalletSummary({
        merchantId,
        userId,
      });

      // Return single object for merchant, array for admin
      if (req.user && req.user.role === "USER") {
        return res.status(200).json({
          success: true,
          data: result.data,
        });
      }

      res.status(200).json({
        success: true,
        data: [result.data],
      });
    } catch (error) {
      console.error("Error in getWalletSummary controller:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching wallet summary",
        error: error.message,
      });
    }
  }

  /**
   * Export transactions to CSV (Async - saves to transaction reports)
   */
  async exportTransactionsToCSV(req, res) {
    try {
      const {
        type,
        merchantId,
        transactionId,
        search,
        amountMin,
        amountMax,
        startDate,
        endDate,
      } = req.query;

      let finalMerchantId = merchantId;
      if (req.user && req.user.role === "USER") {
        if (!req.user.merchantId) {
          return res.status(403).json({ error: "No merchant associated" });
        }
        finalMerchantId = req.user.merchantId;
      }

      // ✅ BUILD FILTERS AS ARRAY (matching CSV export service expectations)
      let filterArray = [];

      if (type && type !== "All") {
        filterArray.push({ property: "type", operator: "eq", value: type });
      }
      if (finalMerchantId) {
        filterArray.push({
          property: "merchantId",
          operator: "eq",
          value: parseInt(finalMerchantId),
        });
      }
      if (transactionId) {
        filterArray.push({
          property: "transactionId",
          operator: "contains",
          value: transactionId,
        });
      }
      if (search) {
        filterArray.push({
          property: "search",
          operator: "contains",
          value: search,
        });
      }
      if (amountMin) {
        filterArray.push({
          property: "amount",
          operator: "gte",
          value: parseFloat(amountMin),
        });
      }
      if (amountMax) {
        filterArray.push({
          property: "amount",
          operator: "lte",
          value: parseFloat(amountMax),
        });
      }

      let formattedStartDate = startDate ? new Date(startDate) : null;
      let formattedEndDate = endDate ? new Date(endDate) : null;

      if (formattedStartDate) {
        formattedStartDate.setHours(0, 0, 0, 0);
      }
      if (formattedEndDate) {
        formattedEndDate.setHours(23, 59, 59, 999);
      }

      const csvExportService = require("../csv-export/csv-export.service");
      const result = await csvExportService.requestCsvExport(
        req.user,
        "PAYIN_WALLETS",
        {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          filters: filterArray.length > 0 ? filterArray : null,
        },
      );

      res.status(202).json({
        success: true,
        message:
          "Export is being processed. You can download it from Transaction Reports.",
        exportId: result.exportId,
      });
    } catch (error) {
      console.error("Error in exportTransactionsToCSV controller:", error);
      res.status(500).json({
        success: false,
        message: "Error exporting transactions",
        error: error.message,
      });
    }
  }

  /**
   * Get single wallet transaction by ID
   */
  async getWalletTransactionById(req, res) {
    try {
      const { id } = req.params;

      const result = await payinWalletService.getWalletTransactionById(id);

      // ✅ FIX: Check if merchant owns this transaction
      if (req.user && req.user.role === "USER") {
        if (!result.data || result.data.merchantId !== req.user.merchantId) {
          return res.status(403).json({
            success: false,
            message: "Access denied - not your transaction",
          });
        }
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getWalletTransactionById controller:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching transaction",
        error: error.message,
      });
    }
  }

  /**
   * Get merchant specific transactions
   */
  async getMerchantTransactions(req, res) {
    try {
      const { merchantId } = req.params;
      const { offset, limit } = req.query;

      const result = await payinWalletService.getMerchantTransactions(
        merchantId,
        {
          offset,
          limit,
        },
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getMerchantTransactions controller:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching merchant transactions",
        error: error.message,
      });
    }
  }

  /**
   * Create wallet transaction
   */
  async createWalletTransaction(req, res) {
    try {
      const {
        merchantId,
        amount,
        type,
        description,
        transactionId,
        transactionDate,
        openingBalance,
        closingBalance,
      } = req.body;

      // Validate required fields
      if (!merchantId || !amount || !type || !description) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: merchantId, amount, type, description",
        });
      }

      const transaction = await prisma.payInWallet.create({
        data: {
          merchantId: parseInt(merchantId),
          amount: parseFloat(amount),
          type,
          description,
          transactionId: transactionId || null,
          transactionDate: transactionDate
            ? new Date(transactionDate)
            : new Date(),
          openingBalance: parseFloat(openingBalance || 0),
          closingBalance: parseFloat(closingBalance || 0),
        },
      });

      res.status(201).json({
        success: true,
        data: transaction,
        message: "Transaction created successfully",
      });
    } catch (error) {
      console.error("Error in createWalletTransaction controller:", error);
      res.status(500).json({
        success: false,
        message: "Error creating transaction",
        error: error.message,
      });
    }
  }
}

module.exports = new PayinWalletController();
