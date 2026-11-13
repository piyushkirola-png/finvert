const { body } = require("express-validator");

const createPayoutPlaygroundValidation = [
  body("amount").notEmpty().isFloat({ min: 0.01 }),
  body("merchantReference").notEmpty().isString(),
  body("beneficiary").isObject(),
  body("beneficiary.name").notEmpty().isString(),
  body("beneficiary.accountNumber")
    .notEmpty()
    .isString()
    .isLength({ min: 9, max: 18 }),
  body("beneficiary.bankName").notEmpty().isString(),
  body("beneficiary.ifsc")
    .notEmpty()
    .isString()
    .isLength({ min: 11, max: 11 })
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/),
];

module.exports = { createPayoutPlaygroundValidation };
