const { body, param, query } = require("express-validator");

const createPayInRequestValidation = [
  body("merchantReference")
    .notEmpty()
    .withMessage("Merchant reference is required")
    .isString()
    .withMessage("Merchant reference must be a string")
    .isLength({ max: 100 })
    .withMessage("Merchant reference max 100 characters"),

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

  body("currency")
    .optional()
    .isString()
    .withMessage("Currency must be a string")
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code (e.g., USD, EUR)")
    .isIn([
      "INR",
      "USD",
      "EUR",
      "VND",
      "PHP",
      "SGD",
      "LKR",
      "GBP",
      "AED",
      "AUD",
      "CAD",
    ])
    .withMessage("Unsupported currency"),

  body("paymentMode")
    .optional()
    .isString()
    .withMessage("Payment mode must be a string")
    .isIn(["UPI", "UPI_INTENT", "UPI_QR", "CARD"])
    .withMessage("Invalid payment mode"),

  body("customer")
    .optional()
    .isObject()
    .withMessage("Customer must be an object"),

  body("customer.name")
    .optional()
    .isString()
    .withMessage("Customer name must be a string")
    .isLength({ max: 100 })
    .withMessage("Customer name max 100 characters"),

  body("customer.email")
    .optional()
    .isEmail()
    .withMessage("Customer email must be valid"),

  body("customer.phone")
    .optional()
    .matches(/^[\+\d\s\-\(\)]{7,20}$/)
    .withMessage("Customer phone must be valid"),

  body("customer.address")
    .optional()
    .isString()
    .withMessage("Customer address must be a string"),

  body("customer.pincode")
    .optional()
    .isPostalCode("IN")
    .withMessage("Invalid pincode"),

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

  body("upiExpiryMinutes")
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage("UPI expiry must be between 1-60 minutes"),
];

const updatePayInRequestValidation = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  body("status")
    .optional()
    .isIn(["COMPLETED", "PENDING", "FAILED"])
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

const getPayInRequestValidation = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
];

const getPayInRequestsValidation = [
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
    .isIn(["COMPLETED", "PENDING", "FAILED"])
    .withMessage("Invalid status"),

  query("sortBy").optional().isString().withMessage("Sort by must be a string"),

  query("sortOrder")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Sort order must be ASC or DESC"),

  query("gatewayId")
    .optional()
    .isInt()
    .withMessage("Gateway ID must be an integer"),

  query("merchantId")
    .optional()
    .isInt()
    .withMessage("Merchant ID must be an integer"),

  query("userId").optional().isInt().withMessage("User ID must be an integer"),

  query("search").optional().isString().withMessage("Search must be a string"),

  query("paymentMode")
    .optional()
    .isString()
    .withMessage("Payment mode must be a string"),

  query("amountMin")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount min must be a positive number"),

  query("amountMax")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount max must be a positive number"),
];

const pgRedirectValidation = [
  param("merchantReference")
    .notEmpty()
    .withMessage("Merchant reference is required")
    .isString()
    .withMessage("Merchant reference must be a string"),
];

module.exports = {
  createPayInRequestValidation,
  updatePayInRequestValidation,
  getPayInRequestValidation,
  getPayInRequestsValidation,
  pgRedirectValidation,
};
