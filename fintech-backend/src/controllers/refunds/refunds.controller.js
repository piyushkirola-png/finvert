const refundsService = require("./refunds.service");
const { validationResult } = require("express-validator");
const prisma = require("../../../config/prisma");

/**
 * Initiate a refund
 */
const initiateRefund = async (req, res) => {
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

    const result = await refundsService.initiateRefund(data, req.user);
    await notificationService.notifyRefundCreated(result, result.merchantId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Initiate refund error:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("permission")
        ? 403
        : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Get all refunds with pagination and filters
 */
const getAllRefunds = async (req, res) => {
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
      merchantReference,
      payInRequestId,
      refundType,
      startDate,
      endDate,
      sorts,
    } = req.query;

    const filterOptions = {
      status,
      merchantId: merchantId ? parseInt(merchantId) : undefined,
      payInRequestId: payInRequestId ? parseInt(payInRequestId) : undefined,
      merchantReference: merchantReference || undefined,
      refundType,
      startDate,
      endDate,
      sorts: sorts ? JSON.parse(sorts) : undefined,
    };

    const result = await refundsService.findAll(
      { offset: parseInt(offset), limit: parseInt(limit) },
      req.user,
      filterOptions,
    );

    res.json({
      success: true,
      data: result.refunds,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get refunds error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Get single refund by ID
 */
const getRefundById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await refundsService.findOne(req.params.id, req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get refund error:", error);
    res
      .status(error.message === "Access denied" ? 403 : 404)
      .json({ success: false, error: error.message });
  }
};

/**
 * Update refund status
 */
const updateRefundStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { status, notes } = req.body;
    const result = await refundsService.updateStatus(
      req.params.id,
      status,
      notes,
      req.user,
    );

    await notificationService.notifyRefundCompleted(result, result.merchantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Update refund status error:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Insufficient balance")
        ? 409
        : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Cancel refund
 */
const cancelRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const { reason, notes } = req.body;
    const result = await refundsService.cancelRefund(
      req.params.id,
      reason,
      notes,
      req.user,
    );

    await notificationService.notifyRefundFailed(result, result.merchantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Cancel refund error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Export refunds to CSV
 */
const exportRefundsCSV = async (req, res) => {
  try {
    const {
      status,
      merchantId,
      payInRequestId,
      merchantReference,
      startDate,
      endDate,
    } = req.query;

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

    if (merchantReference) {
      filters.push({
        property: "payInRequest",
        operator: "contains",
        value: merchantReference,
        field: "merchantReference",
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

    const csvExportService = require("../csv-export/csv-export.service");
    const result = await csvExportService.requestCsvExport(
      req.user,
      "REFUNDS",
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

/**
 * Get refund statistics
 */
const getRefundStats = async (req, res) => {
  try {
    const where = {};

    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      if (!req.user.merchantId) {
        return res.status(403).json({ error: "No merchant associated" });
      }
      where.merchantId = req.user.merchantId;
    }

    const [pending, processing, completed, failed, cancelled, totalAmount] =
      await Promise.all([
        prisma.refund.count({ where: { ...where, status: "PENDING" } }),
        prisma.refund.count({ where: { ...where, status: "PROCESSING" } }),
        prisma.refund.count({ where: { ...where, status: "COMPLETED" } }),
        prisma.refund.count({ where: { ...where, status: "FAILED" } }),
        prisma.refund.count({ where: { ...where, status: "CANCELLED" } }),
        prisma.refund.aggregate({
          where: {
            ...where,
            status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
          },
          _sum: { amount: true },
        }),
      ]);

    res.json({
      pending: pending || 0,
      processing: processing || 0,
      completed: completed || 0,
      failed: failed || 0,
      cancelled: cancelled || 0,
      totalAmount: totalAmount._sum.amount || 0,
    });
  } catch (error) {
    console.error("Get refund stats error:", error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  initiateRefund,
  getAllRefunds,
  getRefundById,
  updateRefundStatus,
  cancelRefund,
  exportRefundsCSV,
  getRefundStats,
};
