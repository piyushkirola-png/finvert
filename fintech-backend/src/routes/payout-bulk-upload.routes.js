const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const payoutBulkUploadController = require("../controllers/payout-requests/Bulk-upload/payout-bulk-upload.controller");
const {
  bulkUploadValidation,
  historyValidation,
  getByIdValidation,
} = require("../controllers/payout-requests/Bulk-upload/payout-bulk-upload.validation");
const { validationResult } = require("express-validator");

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

// Download template
router.get(
  "/template/download",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payoutBulkUploadController.downloadTemplate,
);

// Upload & process
router.post(
  "/",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  validate(bulkUploadValidation),
  (req, res, next) => {
    payoutBulkUploadController.uploadFile(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      return payoutBulkUploadController.bulkUpload(req, res, next);
    });
  },
);

// Schedule upload - ADMIN ONLY
router.post(
  "/schedule",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(bulkUploadValidation),
  payoutBulkUploadController.scheduleUpload,
);

// Admin: all payout uploads
router.get(
  "/admin/history",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(historyValidation),
  payoutBulkUploadController.getAdminHistory,
);

// Admin: stats
router.get(
  "/admin/stats",
  authorize("ADMIN", "SUPER_ADMIN"),
  payoutBulkUploadController.getAdminStats,
);

// Admin: specific upload (any merchant)
router.get(
  "/admin/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payoutBulkUploadController.getAdminBulkUploadById,
);

// User: own history
router.get(
  "/history",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(historyValidation),
  payoutBulkUploadController.getHistory,
);

// User: specific upload
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payoutBulkUploadController.getBulkUploadById,
);

// Download error report
router.get(
  "/:id/error-report",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payoutBulkUploadController.downloadErrorReport,
);

// Retry failed rows
router.post(
  "/:id/retry",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payoutBulkUploadController.retryFailedRows,
);

module.exports = router;