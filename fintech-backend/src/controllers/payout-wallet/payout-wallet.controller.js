const payoutWalletService = require("./payout-wallet.service");
const prisma = require("../../../config/prisma");

// ADD MERCHANT VALIDATION
const getWalletTransactions = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      type,
      merchantId,
      transactionId,
      referenceId,
      search,
      amountMin,
      amountMax,
      startDate,
      endDate,
    } = req.query;

    // Force merchant to see only their data
    let finalMerchantId = merchantId ? parseInt(merchantId) : undefined;
    let finalUserId = undefined;

    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({
          success: false,
          message: "No merchant associated with this user",
        });
      }
      finalMerchantId = req.user.merchantId;
      finalUserId = req.user.id;
    }

    const result = await payoutWalletService.getWalletTransactions({
      offset: parseInt(offset),
      limit: parseInt(limit),
      type,
      merchantId: finalMerchantId,
      userId: finalUserId,
      transactionId,
      referenceId,
      search,
      amountMin: amountMin ? parseFloat(amountMin) : undefined,
      amountMax: amountMax ? parseFloat(amountMax) : undefined,
      startDate,
      endDate,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getWalletTransactions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching wallet transactions",
      error: error.message,
    });
  }
};

// ADD MERCHANT VALIDATION
const getWalletSummary = async (req, res) => {
  try {
    const { merchantId } = req.query;

    let finalMerchantId = merchantId ? parseInt(merchantId) : undefined;
    let finalUserId = undefined;

    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({
          success: false,
          message: "No merchant associated with this user",
        });
      }
      finalMerchantId = req.user.merchantId;
      finalUserId = req.user.id;
    }

    const result = await payoutWalletService.getWalletSummary({
      merchantId: finalMerchantId,
      userId: finalUserId,
    });

    // Return single object for merchant, array for admin
    if (req.user.role === "USER") {
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
    console.error("Error in getWalletSummary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching wallet summary",
      error: error.message,
    });
  }
};

// ADD OWNERSHIP CHECK
const getWalletTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payoutWalletService.getWalletTransactionById(
      parseInt(id),
    );

    // Check if merchant owns this transaction
    if (req.user.role === "USER") {
      if (!result.data || result.data.merchantId !== req.user.merchantId) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your transaction",
        });
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getWalletTransactionById:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transaction",
      error: error.message,
    });
  }
};

const getMerchantTransactions = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { offset = 0, limit = 10 } = req.query;

    // Security check for merchant
    if (req.user.role === "USER") {
      if (req.user.merchantId !== parseInt(merchantId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied - not your merchant data",
        });
      }
    }

    const result = await payoutWalletService.getMerchantTransactions(
      parseInt(merchantId),
      {
        offset: parseInt(offset),
        limit: parseInt(limit),
      },
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getMerchantTransactions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching merchant transactions",
      error: error.message,
    });
  }
};

const createWalletTransaction = async (req, res) => {
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

    if (!merchantId || !amount || !type || !description) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: merchantId, amount, type, description",
      });
    }

    const transaction = await prisma.payOutWallet.create({
      data: {
        merchantId: parseInt(merchantId),
        userId: req.body.userId,
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
    console.error("Error in createWalletTransaction:", error);
    res.status(500).json({
      success: false,
      message: "Error creating transaction",
      error: error.message,
    });
  }
};

// ExportTransactionsToCSV
const exportTransactionsToCSV = async (req, res) => {
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

    // Build filters
    const filters = [];

    if (type && type !== "All") {
      filters.push({ property: "type", operator: "eq", value: type });
    }

    if (transactionId) {
      filters.push({
        property: "transactionId",
        operator: "contains",
        value: transactionId,
      });
    }
    if (search) {
      filters.push({
        property: "description",
        operator: "contains",
        value: search,
      });
    }
    if (amountMin) {
      filters.push({
        property: "amount",
        operator: "gte",
        value: parseFloat(amountMin),
      });
    }
    if (amountMax) {
      filters.push({
        property: "amount",
        operator: "lte",
        value: parseFloat(amountMax),
      });
    }

    // Apply merchant filter for USER role
    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      filters.push({
        property: "merchantId",
        operator: "eq",
        value: req.user.merchantId,
      });
      filters.push({
        property: "userId",
        operator: "eq",
        value: req.user.id,
      });
    } else {
      if (merchantId) {
        filters.push({
          property: "merchantId",
          operator: "eq",
          value: parseInt(merchantId),
        });
      }
    }

    // Format dates properly
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
      "PAYOUT_WALLETS",
      {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        filters: filters.length > 0 ? filters : null,
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
};

const getAllMerchantBalances = async (req, res) => {
  try {
    // Only admins can access this
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const result = await payoutWalletService.getAllMerchantBalances();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getAllMerchantBalances:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching merchant balances",
      error: error.message,
    });
  }
};

module.exports = {
  getAllMerchantBalances,
  getWalletTransactions,
  getWalletSummary,
  getWalletTransactionById,
  getMerchantTransactions,
  createWalletTransaction,
  exportTransactionsToCSV,
};
