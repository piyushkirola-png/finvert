const prisma = require("../../../config/prisma");

const { body, param, query } = require("express-validator");

const createPayoutRequestValidation = [
  body("merchantReference")
    .notEmpty()
    .withMessage("Merchant reference is required")
    .isString()
    .withMessage("Merchant reference must be a string")
    .isLength({ max: 100 })
    .withMessage("Merchant reference max 100 characters"),

  body("userId").optional().isInt().withMessage("User ID must be an integer"),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number")
    .custom((value) => {
      if (value > 10000000) {
        throw new Error("Amount exceeds maximum limit (10,000,000)");
      }
      return true;
    }),

  body("paymentMode")
    .optional()
    .isString()
    .withMessage("Payment mode must be a string")
    .isIn(["BANK", "UPI", "RTGS", "NEFT", "IMPS"])
    .withMessage("Invalid payment mode"),

  body("beneficiary").isObject().withMessage("Beneficiary is required"),

  body("beneficiary.name")
    .notEmpty()
    .withMessage("Beneficiary name is required")
    .isString()
    .withMessage("Beneficiary name must be a string")
    .isLength({ max: 100 })
    .withMessage("Beneficiary name max 100 characters"),

  // CHANGED TO accountNumber
  body("beneficiary.accountNumber")
    .notEmpty()
    .withMessage("Beneficiary account number is required")
    .isString()
    .withMessage("Beneficiary account must be a string")
    .isLength({ min: 9, max: 18 })
    .withMessage("Account number must be between 9-18 characters")
    .matches(/^\d+$/)
    .withMessage("Account number must contain only digits"),

  // CHANGED TO bankName
  body("beneficiary.bankName")
    .notEmpty()
    .withMessage("Beneficiary bank name is required")
    .isString()
    .withMessage("Beneficiary bank must be a string"),

  body("beneficiary.ifsc")
    .notEmpty()
    .withMessage("Beneficiary IFSC code is required")
    .isString()
    .withMessage("Beneficiary IFSC must be a string")
    .isLength({ min: 11, max: 11 })
    .withMessage("IFSC code must be exactly 11 characters")
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage("Invalid IFSC code format"),

  body("idempotencyKey")
    .optional()
    .isString()
    .withMessage("Idempotency key must be a string")
    .isLength({ max: 100 })
    .withMessage("Idempotency key max 100 characters"),

  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Notes max 500 characters"),

  body("callbackUrl")
    .optional()
    .isURL()
    .withMessage("Callback URL must be valid"),
];

const updatePayoutRequestValidation = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  body("status")
    .optional()
    .isIn([
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "EXPIRED",
      "CANCELLED",
    ])
    .withMessage("Invalid status"),

  body("failureReason")
    .optional()
    .isString()
    .withMessage("Failure reason must be a string"),

  body("failureCode")
    .optional()
    .isString()
    .withMessage("Failure code must be a string"),

  body("notes").optional().isString().withMessage("Notes must be a string"),
];

const getPayoutRequestValidation = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
];

const getPayoutRequestsValidation = [
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be valid ISO date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be valid ISO date"),

  query("status")
    .optional()
    .isIn([
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "EXPIRED",
      "CANCELLED",
    ])
    .withMessage("Invalid status"),
];

module.exports = {
  createPayoutRequestValidation,
  updatePayoutRequestValidation,
  getPayoutRequestValidation,
  getPayoutRequestsValidation,
};