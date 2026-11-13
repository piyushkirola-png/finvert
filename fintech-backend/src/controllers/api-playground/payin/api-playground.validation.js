const { body } = require("express-validator");

const createPayInPlaygroundValidation = [
  body("merchantReference").notEmpty().isString().isLength({ max: 100 }),
  body("amount").notEmpty().isFloat({ min: 0.01 }),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }),
  body("paymentMode").optional().isIn(["UPI", "UPI_INTENT", "UPI_QR", "CARD"]),
  body("customer").optional().isObject(),
  body("customer.name").optional().isString(),
  body("customer.email").optional().isEmail(),
  body("customer.phone")
    .optional()
    .matches(/^[\+\d\s\-\(\)]{7,20}$/),
];

module.exports = { createPayInPlaygroundValidation };
