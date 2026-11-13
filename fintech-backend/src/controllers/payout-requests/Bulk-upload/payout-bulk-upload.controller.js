const multer = require("multer");
const path = require("path");
const fs = require("fs");
const payoutBulkUploadService = require("./payout-bulk-upload.service");
const prisma = require("../../../../config/prisma");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "payout-bulk");
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
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv, .xlsx and .xls files are allowed"));
    }
  },
});

const uploadFile = upload.single("file");

const checkMerchantPlan = async (req) => {
  if (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") {
    return {
      id: null,
      planType: "PREMIUM",
      bulkUploadEnabled: true,
    };
  }

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

  return merchant;
};

const bulkUpload = async (req, res) => {
  try {
    const isAdmin =
      req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";

    let merchantId = req.body.merchantId;

    if (isAdmin) {
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          message: "merchantId is required for admin uploads",
        });
      }
    } else {
      const merchant = await checkMerchantPlan(req);
      merchantId = merchant.id;
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const mode = req.body.mode || "instant";
    const scheduleType = req.body.scheduleType || "immediate";
    const intervalValue = req.body.intervalValue || 1;
    const intervalUnit = req.body.intervalUnit || "minutes";

    const result = await payoutBulkUploadService.processBulkUpload({
      filePath: req.file.path,
      originalName: req.file.originalname,
      reqUser: req.user,
      merchantId: merchantId,
      options: {
        mode,
        scheduleType,
        intervalValue,
        intervalUnit,
        scheduledTime: req.body.scheduledTime || null,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.headers["x-device-id"],
        geolocation: req.headers["x-geolocation"],
      },
      type: "PAYOUT",
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Payout bulk upload error:", error);

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    return res.status(400).json({ success: false, message: error.message });
  }
};

// Admin redirects to admin history
const getHistory = async (req, res) => {
  try {
    const isAdmin =
      req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";

    if (isAdmin) {
      return getAdminHistory(req, res);
    }

    await checkMerchantPlan(req);

    const { offset = 0, limit = 10 } = req.query;

    const result = await payoutBulkUploadService.getHistory(
      req.user.merchantId,
      req.user.id,
      {
        offset: parseInt(offset),
        limit: parseInt(limit),
      },
      { type: "PAYOUT", status: req.query.status },
    );

    return res.status(200).json({
      success: true,
      data: result.history,
      total: result.total,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Get payout bulk history error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Admin uses admin endpoint
const getBulkUploadById = async (req, res) => {
  try {
    const isAdmin =
      req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
    const { id } = req.params;

    if (isAdmin) {
      const result = await payoutBulkUploadService.getAdminBulkUploadById(
        parseInt(id),
      );
      return res.status(200).json({
        success: true,
        data: result,
      });
    }

    await checkMerchantPlan(req);
    const result = await payoutBulkUploadService.getBulkUploadById(
      parseInt(id),
      req.user.merchantId,
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get payout bulk upload error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const downloadTemplate = async (req, res) => {
  try {
    const csvContent = payoutBulkUploadService.generateTemplate();

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=payout_bulk_upload_template.csv",
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvContent));

    return res.send(csvContent);
  } catch (error) {
    console.error("Download payout template error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const scheduleUpload = async (req, res) => {
  try {
    const isAdmin =
      req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";

    if (!isAdmin) {
      await checkMerchantPlan(req);
    }

    const { scheduledTime, merchantId } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time is required",
      });
    }

    if (isAdmin && !merchantId) {
      return res.status(400).json({
        success: false,
        message: "merchantId is required for admin schedule",
      });
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Upload scheduled successfully",
      scheduledTime: scheduledDate,
    });
  } catch (error) {
    console.error("Schedule payout upload error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ========== ADMIN METHODS ==========

const getAdminHistory = async (req, res) => {
  try {
    const { offset = 0, limit = 10, status } = req.query;

    const result = await payoutBulkUploadService.getAdminHistory(
      {
        offset: parseInt(offset),
        limit: parseInt(limit),
      },
      {
        status,
        type: "PAYOUT",
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
    console.error("Get admin payout history error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getAdminBulkUploadById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payoutBulkUploadService.getAdminBulkUploadById(
      parseInt(id),
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get admin payout bulk upload error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const stats = await payoutBulkUploadService.getAdminStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const downloadErrorReport = async (req, res) => {
  try {
    const { id } = req.params;

    const bulkUpload = await prisma.bulkUpload.findFirst({
      where: { id: parseInt(id) },
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
        message: "No error report available",
      });
    }

    const errorDetails = bulkUpload.errorReport.details || [];

    if (errorDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No errors found",
      });
    }

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
      `attachment; filename=payout_error_report_${id}.csv`,
    );
    res.setHeader("Content-Length", Buffer.byteLength(csvContent));

    return res.send(csvContent);
  } catch (error) {
    console.error("Download error report error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const retryFailedRows = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payoutBulkUploadService.retryFailedRows(
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

module.exports = {
  uploadFile,
  bulkUpload,
  getHistory,
  getBulkUploadById,
  downloadTemplate,
  scheduleUpload,
  getAdminHistory,
  getAdminBulkUploadById,
  getAdminStats,
  downloadErrorReport,
  retryFailedRows,
};
