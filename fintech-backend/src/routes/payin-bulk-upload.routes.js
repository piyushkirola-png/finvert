const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const payinbulkUploadController = require("../controllers/payin-requests/Bulk-upload/payin-bulk-upload.controller");
const {
  bulkUploadValidation,
  historyValidation,
  getByIdValidation,
} = require("../controllers/payin-requests/Bulk-upload/payin-bulk-upload.validation");
const { validationResult } = require("express-validator");

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

router.use(authMiddleware);

// Upload & process
router.post(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(bulkUploadValidation),
  (req, res, next) => {
    payinbulkUploadController.uploadFile(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      return payinbulkUploadController.bulkUpload(req, res, next);
    });
  },
);

// Download template
router.get(
  "/template/download",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.downloadTemplate,
);

// Schedule upload
router.post(
  "/schedule",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(bulkUploadValidation),
  payinbulkUploadController.scheduleUpload,
);

// Get scheduled task
router.get(
  "/scheduled/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.getScheduledTask,
);

// Admin: all payin uploads
router.get(
  "/admin/history",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(historyValidation),
  payinbulkUploadController.getAdminHistory,
);

// Admin: statistics
router.get(
  "/admin/stats",
  authorize("ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.getAdminStats,
);

// Admin: upload by ID
router.get(
  "/admin/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.getAdminBulkUploadById,
);

// User: history
router.get(
  "/history",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(historyValidation),
  payinbulkUploadController.getHistory,
);

// User: get by ID
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.getBulkUploadById,
);

// Download error report
router.get(
  "/:id/error-report",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.downloadErrorReport,
);

// Download UPI intent .txt file
router.get(
  "/:id/upi-intents",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.downloadUpiIntents,
);

// Retry failed rows
router.post(
  "/:id/retry",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.retryFailedRows,
);

module.exports = router;