const { body, param, query } = require("express-validator");

const initiateChargebackValidation = [
  body("payInRequestId")
    .isInt({ min: 1 })
    .withMessage("Pay-in request ID must be a valid integer")
    .toInt(),
  body("reason")
    .optional()
    .isIn([
      "FRAUDULENT",
      "DUPLICATE",
      "PRODUCT_NOT_RECEIVED",
      "SERVICE_NOT_PROVIDED",
      "UNAUTHORIZED",
      "TECHNICAL_ISSUE",
      "CUSTOMER_DISPUTE",
      "CANCELLED",
      "OTHER",
    ])
    .withMessage("Invalid chargeback reason"),
  body("reasonDescription")
    .optional()
    .isString()
    .withMessage("Reason description must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason description cannot exceed 500 characters"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number")
    .toFloat(),
  body("customerName")
    .optional()
    .isString()
    .withMessage("Customer name must be a string")
    .trim(),
  body("customerEmail")
    .optional()
    .isEmail()
    .withMessage("Customer email must be valid")
    .normalizeEmail(),
  body("customerPhone")
    .optional()
    .isString()
    .withMessage("Customer phone must be a string")
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

const updateChargebackStatusValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Chargeback ID must be a valid integer")
    .toInt(),
  body("status")
    .isIn([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "DISPUTED",
      "RESOLVED",
      "REVERSED",
    ])
    .withMessage("Invalid chargeback status"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
  body("evidenceData")
    .optional()
    .isObject()
    .withMessage("Evidence data must be an object"),
  body("evidenceData.summary")
    .optional()
    .isString()
    .withMessage("Evidence summary must be a string")
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Evidence summary cannot exceed 2000 characters"),
  body("evidenceData.amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Evidence amount must be a positive number"),
];

const respondToChargebackValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Chargeback ID must be a valid integer")
    .toInt(),
  body("response")
    .isString()
    .withMessage("Response is required")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Response must be between 1 and 2000 characters"),
  body("evidence")
    .optional()
    .isArray()
    .withMessage("Evidence must be an array"),
  body("evidence.*")
    .optional()
    .isString()
    .withMessage("Each evidence must be a string (URL or file path)"),
];

const resolveDisputeValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Chargeback ID must be a valid integer")
    .toInt(),
  body("resolution")
    .isIn(["APPROVED", "REJECTED", "REVERSED"])
    .withMessage("Resolution must be APPROVED, REJECTED, or REVERSED"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters"),
];

const reverseChargebackValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Chargeback ID must be a valid integer")
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

const getChargebackValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Chargeback ID must be a valid integer")
    .toInt(),
];

const getChargebacksValidation = [
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
    .isIn([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "DISPUTED",
      "RESOLVED",
      "REVERSED",
    ])
    .withMessage("Invalid chargeback status"),
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
  query("amountMin")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum amount must be a positive number")
    .toFloat(),
  query("amountMax")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum amount must be a positive number")
    .toFloat(),
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
  query("search")
    .optional()
    .isString()
    .withMessage("Search query must be a string")
    .trim(),
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
  initiateChargebackValidation,
  updateChargebackStatusValidation,
  respondToChargebackValidation,
  resolveDisputeValidation,
  reverseChargebackValidation,
  getChargebackValidation,
  getChargebacksValidation,
};
