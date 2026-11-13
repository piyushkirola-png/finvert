const { body, param, query } = require("express-validator");

const initiateRefundValidation = [
  body("payInRequestId")
    .isInt({ min: 1 })
    .withMessage("Pay-in request ID must be a valid integer")
    .toInt(),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number")
    .toFloat(),
  body("reason")
    .optional()
    .isString()
    .withMessage("Reason must be a string")
    .trim(),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

const updateRefundStatusValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Refund ID must be a valid integer")
    .toInt(),
  body("status")
    .isIn(["COMPLETED", "PROCESSING", "PENDING", "FAILED", "CANCELLED"])
    .withMessage("Invalid refund status"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];

const cancelRefundValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Refund ID must be a valid integer")
    .toInt(),
  body("reason")
    .optional()
    .isString()
    .withMessage("Reason must be a string")
    .trim(),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];

const getRefundValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Refund ID must be a valid integer")
    .toInt(),
];

const getRefundsValidation = [
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("status")
    .optional()
    .isIn(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
    .withMessage("Invalid refund status"),
  query("merchantId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Merchant ID must be a valid integer")
    .toInt(),
  query("payInRequestId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Pay-in request ID must be a valid integer")
    .toInt(),
  query("merchantReference")
    .optional()
    .isString()
    .withMessage("Merchant reference must be a string")
    .trim(),
  query("refundType")
    .optional()
    .isIn(["FULL", "PARTIAL"])
    .withMessage("Refund type must be FULL or PARTIAL"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date")
    .custom((value, { req }) => {
      if (
        req.query.startDate &&
        new Date(value) < new Date(req.query.startDate)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  query("sorts")
    .optional()
    .custom((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        throw new Error("Sorts must be a valid JSON object");
      }
    }),
];

module.exports = {
  initiateRefundValidation,
  updateRefundStatusValidation,
  cancelRefundValidation,
  getRefundValidation,
  getRefundsValidation,
};
