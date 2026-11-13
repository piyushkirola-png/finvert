const chargebacksService = require("./chargebacks.service");
const { validationResult } = require("express-validator");
const { Parser } = require("json2csv");

/**
 * Initiate a chargeback
 */
const initiateChargeback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const data = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const result = await chargebacksService.initiateChargeback(data, req.user);
    await notificationService.notifyChargebackCreated(
      result,
      req.user.merchantId,
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Initiate chargeback error:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("permission")
        ? 403
        : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Get all chargebacks with pagination and filters
 */
const getAllChargebacks = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      offset = 0,
      limit = 10,
      status,
      merchantId,
      payInRequestId,
      amountMin,
      amountMax,
      startDate,
      endDate,
      search,
      sorts,
    } = req.query;

    const filterOptions = {
      status,
      merchantId: merchantId ? parseInt(merchantId) : undefined,
      payInRequestId: payInRequestId ? parseInt(payInRequestId) : undefined,
      amountMin: amountMin ? parseFloat(amountMin) : undefined,
      amountMax: amountMax ? parseFloat(amountMax) : undefined,
      startDate,
      endDate,
      search,
      sorts: sorts ? JSON.parse(sorts) : undefined,
    };

    const result = await chargebacksService.findAll(
      { offset: parseInt(offset), limit: parseInt(limit) },
      req.user,
      filterOptions,
    );

    res.json({
      success: true,
      data: result.chargebacks,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get chargebacks error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Get single chargeback by ID
 */
const getChargebackById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await chargebacksService.findOne(req.params.id, req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get chargeback error:", error);
    const statusCode =
      error.message === "Access denied"
        ? 403
        : error.message === "Chargeback not found"
          ? 404
          : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Update chargeback status
 */
const updateChargebackStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { status, notes, evidenceData } = req.body;
    const result = await chargebacksService.updateStatus(
      req.params.id,
      status,
      notes,
      { ...req.user, ipAddress: req.ip, userAgent: req.headers["user-agent"] },
      { evidenceData },
    );

    if (status === "RESOLVED") {
      await notificationService.notifyChargebackResolved(
        result,
        req.user.merchantId,
      );
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Update chargeback status error:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Insufficient balance")
        ? 409
        : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Respond to chargeback dispute
 */
const respondToChargeback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await chargebacksService.respondToChargeback(
      req.params.id,
      req.body,
      req.user,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Respond to chargeback error:", error);
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Resolve chargeback dispute
 */
const resolveDispute = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { resolution, notes } = req.body;
    const result = await chargebacksService.resolveDispute(
      req.params.id,
      resolution,
      notes,
      req.user,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Reverse chargeback
 */
const reverseChargeback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { reason, notes } = req.body;
    const result = await chargebacksService.reverseChargeback(
      req.params.id,
      reason,
      notes,
      req.user,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Reverse chargeback error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Get chargeback statistics
 */
const getChargebackStats = async (req, res) => {
  try {
    const { period = "all" } = req.query;
    const stats = await chargebacksService.getStats(period, req.user);
    res.json({ success: true, ...stats });
  } catch (error) {
    console.error("Get chargeback stats error:", error);
    const statusCode = error.message === "Access denied" ? 403 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Export chargebacks to CSV
 */
const exportChargebacksCSV = async (req, res) => {
  try {
    const { status, merchantId, payInRequestId, startDate, endDate } =
      req.query;

    // Build filters
    const filters = [];
    if (status) {
      filters.push({ property: "status", operator: "eq", value: status });
    }
    if (merchantId) {
      filters.push({
        property: "merchantId",
        operator: "eq",
        value: parseInt(merchantId),
      });
    }
    if (payInRequestId) {
      filters.push({
        property: "payInRequestId",
        operator: "eq",
        value: parseInt(payInRequestId),
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
      "CHARGEBACKS",
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
    console.error("Export CSV error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  initiateChargeback,
  getAllChargebacks,
  getChargebackById,
  updateChargebackStatus,
  respondToChargeback,
  resolveDispute,
  reverseChargeback,
  getChargebackStats,
  exportChargebacksCSV,
};
