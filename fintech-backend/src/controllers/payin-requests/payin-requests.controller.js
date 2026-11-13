const payInRequestsService = require("./payin-requests.service");
const { validationResult } = require("express-validator");
const prisma = require("../../../config/prisma");

const redactVendorFields = (payInRequest) => {
  if (!payInRequest) return payInRequest;

  let utr = "";
  if (payInRequest.metadata && payInRequest.metadata.utr) {
    utr = payInRequest.metadata.utr;
  }

  const allowedFields = [
    "id",
    "merchantId",
    "amount",
    "status",
    "merchantReference",
    "userId",
    "requestedAt",
    "completedAt",
    "expiresAt",
    "merchantRate",
    "payInWalletTransactionId",
    "failureReason",
    "failureCode",
    "taxRate",
    "taxAmount",
    "feeType",
    "feeRate",
    "feeAmount",
    "amountToCredit",
    "callbackNeeded",
    "url",
    "createdAt",
    "updatedAt",
    "paymentMode",
    "customerName",
    "customerEmail",
    "customerPhone",
  ];

  // Only show intent for non-PG payment modes
  if (payInRequest.paymentMode !== "PG") {
    allowedFields.push("intent");
  }

  const safeResponse = { utr };
  for (const field of allowedFields) {
    if (payInRequest[field] !== undefined) {
      safeResponse[field] = payInRequest[field];
    }
  }

  return safeResponse;
};

/**
 * Create a new pay-in request
 */
const create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const requestData = { ...req.body };

    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({
          error: "No merchant associated with this user",
        });
      }
      requestData.merchantId = req.user.merchantId;
      requestData.userId = req.user.id;
    }

    const result = await payInRequestsService.create(
      requestData,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.headers["x-device-id"],
        geolocation: req.headers["x-geolocation"],
      },
      req.user,
    );

    if (req.user.role === "USER") {
      return res.status(201).json(redactVendorFields(result));
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("Create pay-in request error:", error);
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Get pay-in request by merchant reference
 */
const findByMerchantReference = async (req, res) => {
  try {
    const { merchantReference } = req.params;

    const result =
      await payInRequestsService.findByMerchantReference(merchantReference);

    // Check if user has access to this merchant
    if (req.user.role === "USER") {
      if (!req.user.merchantId || result.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      return res.json(redactVendorFields(result));
    }

    res.json(result);
  } catch (error) {
    console.error("Get pay-in request by merchant reference error:", error);
    res.status(404).json({ error: error.message });
  }
};

/**
 * GET /api/payin-requests
 */
const findAll = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      gatewayId,
      gatewayName,
      merchantId,
      userId,
      status,
      search,
      utr,
      paymentMode,
      feeType,
      amountMin,
      amountMax,
      sortBy = "id",
      sortOrder = "DESC",
    } = req.query;

    let filterStartDate = req.query.startDate;
    let filterEndDate = req.query.endDate;

    // CHECK IF ANY NON-DATE FILTERS ARE APPLIED
    const hasNonDateFilters =
      gatewayId ||
      gatewayName ||
      merchantId ||
      userId ||
      (status && status !== "All") ||
      search ||
      utr ||
      (paymentMode && paymentMode !== "All") ||
      amountMin ||
      amountMax ||
      (feeType && feeType !== "All");

    // ONLY default to TODAY if NO filters at all (including no date)
    if (!filterStartDate && !filterEndDate && !hasNonDateFilters) {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const year = istNow.getUTCFullYear();
      const month = istNow.getUTCMonth();
      const day = istNow.getUTCDate();

      const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      startUTC.setTime(startUTC.getTime() - istOffset);

      const endUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      endUTC.setTime(endUTC.getTime() - istOffset);

      filterStartDate = startUTC.toISOString();
      filterEndDate = endUTC.toISOString();
    } else {
    }

    const filterOptions = {};

    if (gatewayId) {
      filterOptions.gatewayId = parseInt(gatewayId);
    }

    // Convert GatewayId to GatewayName
    if (gatewayName && gatewayName !== "All" && gatewayName !== "") {
      const gateway = await prisma.gateway.findFirst({
        where: {
          name: { equals: gatewayName, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (gateway) {
        filterOptions.gatewayId = gateway.id;
      }
    }

    if (merchantId) filterOptions.merchantId = parseInt(merchantId);
    if (userId) filterOptions.userId = parseInt(userId);
    if (status && status !== "All") filterOptions.status = status;
    if (search) filterOptions.search = search;
    if (utr) filterOptions.utr = utr.trim();
    if (paymentMode && paymentMode !== "All")
      filterOptions.paymentMode = paymentMode;
    if (amountMin) filterOptions.amountMin = parseFloat(amountMin);
    if (amountMax) filterOptions.amountMax = parseFloat(amountMax);
    if (feeType && feeType !== "All") filterOptions.feeType = feeType;

    filterOptions.sorts = { [sortBy]: sortOrder.toLowerCase() };

    // Apply merchant filter from user token
    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      filterOptions.merchantId = req.user.merchantId;
      filterOptions.userId = req.user.id;
    }

    const result = await payInRequestsService.findAll(
      { offset: parseInt(offset), limit: parseInt(limit) },
      req.user,
      filterStartDate ? new Date(filterStartDate) : null,
      filterEndDate ? new Date(filterEndDate) : null,
      filterOptions,
    );

    // Add UTR from metadata
    const payInRequestsWithUtr = result.payInRequests.map((request) => {
      let utr = "";
      if (request.metadata && request.metadata.utr) {
        utr = request.metadata.utr;
      }
      return { ...request, utr };
    });

    let finalRequests = payInRequestsWithUtr;
    if (req.user.role === "USER") {
      finalRequests = payInRequestsWithUtr.map((r) => redactVendorFields(r));
    }

    res.json({
      data: finalRequests,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get pay-in requests error:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get single pay-in request by ID
 */
const findOne = async (req, res) => {
  try {
    const result = await payInRequestsService.findOne(parseInt(req.params.id));

    if (req.user.role === "USER") {
      if (!req.user.merchantId || result.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (result.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      return res.json(redactVendorFields(result));
    }

    res.json(result);
  } catch (error) {
    console.error("Get pay-in request error:", error);
    res.status(404).json({ error: error.message });
  }
};

/**
 * Update pay-in request
 */
const update = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await payInRequestsService.update(
      parseInt(req.params.id),
      req.body,
    );
    res.json(result);
  } catch (error) {
    console.error("Update pay-in request error:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete pay-in request
 */
const remove = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json({ message: "Delete functionality to be implemented" });
  } catch (error) {
    console.error("Delete pay-in request error:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    let startDate, endDate;

    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const where = {};

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      where.merchantId = req.user.merchantId;
      where.userId = req.user.id;
    }

    // USE THE DYNAMIC DATES
    where.requestedAt = {
      gte: startDate,
      lte: endDate,
    };

    const [total, pending, completed, failed] = await Promise.all([
      prisma.payInRequest.count({ where }),
      prisma.payInRequest.count({ where: { ...where, status: "PENDING" } }),
      prisma.payInRequest.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.payInRequest.count({ where: { ...where, status: "FAILED" } }),
    ]);

    const amountAggregate = await prisma.payInRequest.aggregate({
      where: { ...where, status: "COMPLETED" },
      _sum: { amount: true },
    });

    res.json({
      total: total || 0,
      pending: pending || 0,
      approved: completed || 0,
      rejected: failed || 0,
      totalAmount: Number(amountAggregate._sum.amount || 0),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pay-in request statistics summary
 */
const getStats = async (req, res) => {
  try {
    if (
      req.user.role !== "ADMIN" &&
      req.user.role !== "SUPER_ADMIN" &&
      req.user.role !== "USER"
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const stats = await payInRequestsService.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Retry failed pay-in request
 */
const retry = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await payInRequestsService.retry(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error("Retry pay-in request error:", error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Export pay-in requests to CSV
 */
const exportCSV = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      paymentMode,
      gatewayId,
      merchantId,
      userId,
      search,
      amountMin,
      amountMax,
      sortBy,
      sortOrder,
      feeType,
    } = req.query;

    let filterArray = [];

    if (status && status !== "All" && status !== "all") {
      filterArray.push({ property: "status", operator: "eq", value: status });
    }
    if (paymentMode && paymentMode !== "All" && paymentMode !== "all") {
      filterArray.push({
        property: "paymentMode",
        operator: "eq",
        value: paymentMode,
      });
    }
    if (gatewayId) {
      filterArray.push({
        property: "gatewayId",
        operator: "eq",
        value: parseInt(gatewayId),
      });
    }
    if (merchantId) {
      filterArray.push({
        property: "merchantId",
        operator: "eq",
        value: parseInt(merchantId),
      });
    }
    if (userId) {
      filterArray.push({
        property: "userId",
        operator: "eq",
        value: parseInt(userId),
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
    if (feeType && feeType !== "All" && feeType !== "all") {
      filterArray.push({ property: "feeType", operator: "eq", value: feeType });
    }

    // USER ROLE
    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      filterArray.push({
        property: "merchantId",
        operator: "eq",
        value: req.user.merchantId,
      });
    }

    let sortOptions = null;
    if (sortBy) {
      sortOptions = { [sortBy]: (sortOrder || "DESC").toLowerCase() };
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
      "PAYIN_REQUESTS",
      {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        filters: filterArray.length > 0 ? filterArray : null,
        sorts: sortOptions,
      },
    );

    res.status(202).json({
      success: true,
      message:
        "Export is being processed. You can download it from Transaction Reports.",
      exportId: result.exportId,
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  create,
  findAll,
  findByMerchantReference,
  findOne,
  update,
  remove,
  getStats,
  getDashboardStats,
  retry,
  exportCSV,
};
