const { body, query, param } = require("express-validator");

const bulkUploadValidation = [
  body("mode")
    .optional()
    .isIn(["instant", "scheduled"])
    .withMessage("Mode must be 'instant' or 'scheduled'"),

  body("scheduleType")
    .optional()
    .isIn(["immediate", "interval", "cron"])
    .withMessage("Schedule type must be 'immediate', 'interval', or 'cron'"),

  body("intervalValue")
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage("Interval value must be between 1 and 60"),

  body("intervalUnit")
    .optional()
    .isIn(["minutes", "seconds"])
    .withMessage("Interval unit must be 'minutes' or 'seconds'"),

  body("scheduledTime")
    .optional()
    .isISO8601()
    .withMessage("Scheduled time must be a valid ISO date")
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error("Scheduled time must be in the future");
      }
      return true;
    }),
];

const historyValidation = [
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
];

const getByIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),
];

module.exports = {
  bulkUploadValidation,
  historyValidation,
  getByIdValidation,
};
