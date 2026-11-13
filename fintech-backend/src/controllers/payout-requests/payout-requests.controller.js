const payoutRequestsService = require("./payout-requests.service");
const { validationResult } = require("express-validator");
const prisma = require("../../../config/prisma");

const redactVendorFields = (payoutRequest) => {
  if (!payoutRequest) return payoutRequest;

  const allowedFields = [
    "id",
    "merchantId",
    "amount",
    "status",
    "merchantReference",
    "userId",
    "paymentMode",
    "requestedAt",
    "completedAt",
    "expiresAt",
    "merchantRate",
    "payOutWalletTransactionId",
    "failureReason",
    "failureCode",
    "taxRate",
    "taxAmount",
    "feeType",
    "feeRate",
    "feeAmount",
    "amountToDebit",
    "beneficiaryName",
    "beneficiaryAccount",
    "beneficiaryBank",
    "beneficiaryIfsc",
    "callbackNeeded",
    "createdAt",
    "updatedAt",
  ];

  const safeResponse = {};
  for (const field of allowedFields) {
    if (payoutRequest[field] !== undefined) {
      safeResponse[field] = payoutRequest[field];
    }
  }

  return safeResponse;
};

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

    const result = await payoutRequestsService.create(
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
    console.error("Create payout request error:", error);
    return res.status(400).json({ error: error.message });
  }
};

// findAll WITH BETTER FILTER HANDLING
const findAll = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      startDate,
      endDate,
      status,
      merchantId,
      gatewayId,
      gatewayName,
      search,
      utr,
      amountMin,
      amountMax,
      sortBy = "requestedAt",
      sortOrder = "DESC",
      paymentMode,
      feeType,
    } = req.query;

    let formattedStartDate = startDate ? new Date(startDate) : null;
    let formattedEndDate = endDate ? new Date(endDate) : null;

    // CHECK IF ANY NON-DATE FILTERS ARE APPLIED
    const hasNonDateFilters =
      gatewayId ||
      gatewayName ||
      merchantId ||
      req.query.userId ||
      (status && status !== "All" && status !== "all") ||
      search ||
      utr ||
      amountMin ||
      amountMax ||
      (paymentMode && paymentMode !== "All" && paymentMode !== "all") ||
      (feeType && feeType !== "All" && feeType !== "all");

    // ONLY default to TODAY if NO filters at all
    if (!startDate && !endDate && !hasNonDateFilters) {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;

      // Get current time in IST
      const istNow = new Date(now.getTime() + istOffset);

      // Get date components in IST
      const year = istNow.getUTCFullYear();
      const month = istNow.getUTCMonth();
      const day = istNow.getUTCDate();

      const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      startUTC.setTime(startUTC.getTime() - istOffset);

      const endUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      endUTC.setTime(endUTC.getTime() - istOffset);

      formattedStartDate = startUTC;
      formattedEndDate = endUTC;
    }

    // Build filter options
    const filterOptions = {};

    // Convert GatewayId to GatewayName
    let finalGatewayId = gatewayId;
    if (gatewayName && gatewayName !== "All" && gatewayName !== "all") {
      // Find gateway by name
      const gateway = await prisma.gateway.findFirst({
        where: {
          name: {
            equals: gatewayName,
            mode: "insensitive",
          },
        },
      });
      if (gateway) {
        finalGatewayId = gateway.id;
      }
    }

    // Add status filter
    if (status && status !== "All" && status !== "all") {
      filterOptions.status = status;
    }

    // Add merchant filter
    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      filterOptions.merchantId = req.user.merchantId;
      filterOptions.userId = req.user.id;
    } else {
      if (merchantId) {
        filterOptions.merchantId = parseInt(merchantId);
      }
      if (req.query.userId) {
        filterOptions.userId = parseInt(req.query.userId);
      }
    }

    // Add gateway filter
    if (finalGatewayId) {
      filterOptions.gatewayId = parseInt(finalGatewayId);
    }

    // Add search
    if (search) {
      filterOptions.search = search;
    }

    if (utr) filterOptions.utr = utr.trim();

    // Add amount range
    if (amountMin) {
      filterOptions.amountMin = parseFloat(amountMin);
    }
    if (amountMax) {
      filterOptions.amountMax = parseFloat(amountMax);
    }

    // Payment Mode
    if (paymentMode && paymentMode !== "All" && paymentMode !== "all") {
      filterOptions.paymentMode = paymentMode;
    }

    // Fee Type
    if (feeType && feeType !== "All" && feeType !== "all") {
      filterOptions.feeType = feeType;
    }

    // Sort options
    filterOptions.sorts = { [sortBy]: sortOrder.toLowerCase() };

    const result = await payoutRequestsService.findAll(
      { offset: parseInt(offset), limit: parseInt(limit) },
      req.user,
      formattedStartDate,
      formattedEndDate,
      filterOptions,
    );

    let finalRequests = result.payoutRequests;

    res.json({
      data: finalRequests,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get payout requests error:", error);
    res.status(400).json({ error: error.message });
  }
};

const findOne = async (req, res) => {
  try {
    const result = await payoutRequestsService.findOne(parseInt(req.params.id));

    if (req.user.role === "USER") {
      if (!req.user.merchantId || result.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (result.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      return res.json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Get payout request error:", error);
    res.status(404).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await payoutRequestsService.update(
      parseInt(req.params.id),
      req.body,
    );
    res.json(result);
  } catch (error) {
    console.error("Update payout request error:", error);
    res.status(400).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json({ message: "Delete functionality to be implemented" });
  } catch (error) {
    console.error("Delete payout request error:", error);
    res.status(400).json({ error: error.message });
  }
};

// getDashboardStats WITH userId FILTER
const getDashboardStats = async (req, res) => {
  try {
    let startDate, endDate;

    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
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
      if (req.user.id) {
        where.userId = req.user.id;
      }
    }

    where.requestedAt = {
      gte: startDate,
      lte: endDate,
    };

    const [total, pending, completed, failed] = await Promise.all([
      prisma.payOutRequest.count({ where }),
      prisma.payOutRequest.count({ where: { ...where, status: "PENDING" } }),
      prisma.payOutRequest.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.payOutRequest.count({ where: { ...where, status: "FAILED" } }),
    ]);

    const amountAggregate = await prisma.payOutRequest.aggregate({
      where: { ...where, status: "COMPLETED" },
      _sum: { amount: true },
    });

    res.json({
      total: total || 0,
      pending: pending || 0,
      completed: completed || 0,
      failed: failed || 0,
      approved: completed || 0,
      rejected: failed || 0,
      totalAmount: Number(amountAggregate._sum.amount || 0),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

const retry = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await payoutRequestsService.retry(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error("Retry payout request error:", error);
    res.status(400).json({ error: error.message });
  }
};

// exportCSV WITH PROPER DATE HANDLING
const exportCSV = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      merchantId,
      gatewayId,
      search,
      amountMin,
      amountMax,
      sortBy,
      sortOrder,
    } = req.query;

    // Build filters array
    let filterArray = [];

    if (status && status !== "All" && status !== "all") {
      filterArray.push({ property: "status", operator: "eq", value: status });
    }
    if (gatewayId) {
      filterArray.push({
        property: "gatewayId",
        operator: "eq",
        value: parseInt(gatewayId),
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

    // Apply merchant filter for MERCHANT role
    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      filterArray.push({
        property: "merchantId",
        operator: "eq",
        value: req.user.merchantId,
      });
      filterArray.push({
        property: "userId",
        operator: "eq",
        value: req.user.id,
      });
    } else {
      if (merchantId) {
        filterArray.push({
          property: "merchantId",
          operator: "eq",
          value: parseInt(merchantId),
        });
      }
    }

    // Build sort options
    let sortOptions = null;
    if (sortBy) {
      sortOptions = { [sortBy]: (sortOrder || "DESC").toLowerCase() };
    }

    // Format dates - SET END OF DAY
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
      "PAYOUT_REQUESTS",
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
  findOne,
  update,
  remove,
  getDashboardStats,
  retry,
  exportCSV,
};
