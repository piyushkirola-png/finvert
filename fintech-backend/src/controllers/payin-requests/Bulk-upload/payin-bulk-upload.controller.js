const multer = require("multer");
const path = require("path");
const fs = require("fs");
const payinbulkUploadService = require("./payin-bulk-upload.service");
const prisma = require("../../../../config/prisma");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "bulk");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".csv", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();

    const allowedMimeTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowed.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv, .xlsx and .xls files are allowed"));
    }
  },
});

const uploadFile = upload.single("file");

/**
 * Check if merchant has PREMIUM plan
 */
const checkMerchantPlan = async (req) => {
  if (!req.user || !req.user.merchantId) {
    throw new Error("User not associated with any merchant");
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: req.user.merchantId },
    select: {
      id: true,
      planType: true,
      bulkUploadEnabled: true,
    },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  if (merchant.planType !== "PREMIUM" || !merchant.bulkUploadEnabled) {
    throw new Error(
      "Bulk upload is only available for PREMIUM merchants. Please upgrade your plan.",
    );
  }

  // Daily upload limit removed
  return merchant;
};

/**
 * Upload and process bulk file
 */
const bulkUpload = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const mode = req.body.mode || "instant";
    const scheduleType = req.body.scheduleType || "immediate";
    const intervalValue = req.body.intervalValue || 1;
    const intervalUnit = req.body.intervalUnit || "minutes";

    const result = await payinbulkUploadService.processBulkUpload({
      filePath: req.file.path,
      originalName: req.file.originalname,
      reqUser: req.user,
      options: {
        mode,
        scheduleType,
        intervalValue,
        intervalUnit,
        scheduledTime: req.body.scheduledTime,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.headers["x-device-id"],
        geolocation: req.headers["x-geolocation"],
      },
      type: "PAYIN",
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Bulk upload error:", error);

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get bulk upload history
 */
const getHistory = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { offset = 0, limit = 10, status } = req.query;

    const result = await payinbulkUploadService.getHistory(
      req.user.merchantId,
      req.user.id,
      {
        offset: parseInt(offset),
        limit: parseInt(limit),
      },
      {
        status,
        type: "PAYIN",
      },
    );

    return res.status(200).json({
      success: true,
      data: result.history,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get bulk upload by ID
 */
const getBulkUploadById = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { id } = req.params;
    const result = await payinbulkUploadService.getBulkUploadById(
      parseInt(id),
      req.user.merchantId,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get bulk upload error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Download CSV template
 */
const downloadTemplate = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const csvContent = payinbulkUploadService.generateTemplate();

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=payin_bulk_upload_template.csv",
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvContent));

    return res.send(csvContent);
  } catch (error) {
    console.error("Download template error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Schedule bulk upload
 */
const scheduleUpload = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { scheduledTime, fileId } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time is required",
      });
    }

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: "Bulk upload ID is required",
      });
    }

    const scheduledDate = new Date(scheduledTime);
    const now = new Date();

    if (scheduledDate <= now) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    const MAX_SCHEDULE_DAYS = 30;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_SCHEDULE_DAYS);

    if (scheduledDate > maxDate) {
      return res.status(400).json({
        success: false,
        message: `Scheduled time cannot be more than ${MAX_SCHEDULE_DAYS} days in the future`,
      });
    }

    const bulkUpload = await prisma.bulkUpload.findFirst({
      where: {
        id: parseInt(fileId),
        merchantId: req.user.merchantId,
        status: "PENDING",
      },
    });

    if (!bulkUpload) {
      return res.status(404).json({
        success: false,
        message: "Bulk upload not found or already processed",
      });
    }

    const scheduledTask = await prisma.scheduledTask.create({
      data: {
        merchantId: req.user.merchantId,
        bulkUploadId: parseInt(fileId),
        scheduledTime: scheduledDate,
        status: "PENDING",
      },
    });

    await prisma.bulkUpload.update({
      where: { id: parseInt(fileId) },
      data: {
        status: "PENDING",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Upload scheduled successfully",
      scheduledTime: scheduledDate,
      scheduledTaskId: scheduledTask.id,
      bulkUploadId: parseInt(fileId),
    });
  } catch (error) {
    console.error("Schedule upload error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get scheduled task status
 */
const getScheduledTask = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { id } = req.params;

    const scheduledTask = await prisma.scheduledTask.findFirst({
      where: {
        id: parseInt(id),
        merchantId: req.user.merchantId,
      },
      include: {
        bulkUpload: {
          select: {
            fileName: true,
            totalRows: true,
            successRows: true,
            failedRows: true,
            status: true,
          },
        },
      },
    });

    if (!scheduledTask) {
      return res.status(404).json({
        success: false,
        message: "Scheduled task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: scheduledTask,
    });
  } catch (error) {
    console.error("Get scheduled task error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Retry failed rows
 */
const retryFailedRows = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { id } = req.params;
    const result = await payinbulkUploadService.retryFailedRows(
      parseInt(id),
      req.user.merchantId,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Retry failed rows error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN: Get all bulk uploads across all merchants
 */
const getAdminHistory = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 10,
      status,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const result = await payinbulkUploadService.getAllHistory(
      { status, search, dateFrom, dateTo, type: "PAYIN" },
      {
        offset: parseInt(offset),
        limit: parseInt(limit),
      },
    );

    return res.status(200).json({
      success: true,
      data: result.history,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get admin history error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN: Get admin statistics
 */
const getAdminStats = async (req, res) => {
  try {
    const stats = await payinbulkUploadService.getAdminStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * ADMIN: Get bulk upload by ID (without merchant filter)
 */
const getAdminBulkUploadById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payinbulkUploadService.getBulkUploadByIdAdmin(
      parseInt(id),
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get admin bulk upload error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Download UPI intent .txt file (only upi://pay?... links)
 */
const downloadUpiIntents = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { id } = req.params;

    const bulk = await prisma.bulkUpload.findFirst({
      where: {
        id: parseInt(id),
        merchantId: req.user.merchantId,
      },
    });

    if (!bulk) {
      return res.status(404).json({
        success: false,
        message: "Bulk upload not found",
      });
    }

    if (!bulk.upiIntentFileUrl) {
      return res.status(404).json({
        success: false,
        message: "No UPI intents available for this upload",
      });
    }

    const absPath = path.join(
      process.cwd(),
      bulk.upiIntentFileUrl.replace(/^\/+/, ""),
    );

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        success: false,
        message: "UPI intent file not found",
      });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=upi-intents-${bulk.id}.txt`,
    );

    return res.send(fs.readFileSync(absPath, "utf8"));
  } catch (error) {
    console.error("Download UPI intents error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Download error report for failed rows
 */
const downloadErrorReport = async (req, res) => {
  try {
    await checkMerchantPlan(req);

    const { id } = req.params;

    const bulkUpload = await prisma.bulkUpload.findFirst({
      where: {
        id: parseInt(id),
        merchantId: req.user.merchantId,
      },
    });

    if (!bulkUpload) {
      return res.status(404).json({
        success: false,
        message: "Bulk upload not found",
      });
    }

    if (!bulkUpload.errorReport) {
      return res.status(404).json({
        success: false,
        message: "No error report available for this upload",
      });
    }

    // Generate CSV error report
    const errorDetails = bulkUpload.errorReport.details || [];

    if (errorDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No errors found in this upload",
      });
    }

    // Create CSV content
    const headers = ["Row Number", "Merchant Reference", "Error Message"];
    const rows = errorDetails.map((err) => [
      err.rowNumber || "",
      err.merchantReference || "",
      err.error || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=error_report_${id}.csv`,
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvContent));

    return res.send(csvContent);
  } catch (error) {
    console.error("Download error report error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadFile,
  bulkUpload,
  getHistory,
  getBulkUploadById,
  downloadTemplate,
  downloadUpiIntents,
  scheduleUpload,
  downloadErrorReport,
  getScheduledTask,
  retryFailedRows,
  getAdminHistory,
  getAdminStats,
  getAdminBulkUploadById,
};
