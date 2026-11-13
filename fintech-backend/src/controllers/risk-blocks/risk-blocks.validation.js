const VALID_TYPES = [
  "USER_ID",
  "MERCHANT_ID",
  "EMAIL",
  "PHONE_NUMBER",
  "CARD_BIN",
  "CARD_LAST4",
  "VPA",
  "IP_ADDRESS",
  "DEVICE_ID",
];

const validateRiskBlock = (req, res, next) => {
  const { type, value } = req.body;

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Risk block type is required and must be one of: ${VALID_TYPES.join(", ")}`,
    });
  }

  if (!value || String(value).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Risk block value is required",
    });
  }

  if (type === "EMAIL" && !String(value).includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Risk block email is invalid",
    });
  }

  if (
    type === "PHONE_NUMBER" &&
    !String(value)
      .replace(/\D/g, "")
      .match(/^\d{7,15}$/)
  ) {
    return res.status(400).json({
      success: false,
      message: "Risk block phone number is invalid",
    });
  }

  if (
    type === "CARD_BIN" &&
    !String(value)
      .replace(/\D/g, "")
      .match(/^\d{6}$/)
  ) {
    return res.status(400).json({
      success: false,
      message: "Card BIN must be 6 digits",
    });
  }

  if (
    type === "CARD_LAST4" &&
    !String(value)
      .replace(/\D/g, "")
      .match(/^\d{4}$/)
  ) {
    return res.status(400).json({
      success: false,
      message: "Card last4 must be 4 digits",
    });
  }

  if (type === "VPA") {
    // UPI ID format: something@provider
    if (!String(value).includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid VPA (UPI ID) format. Must contain @",
      });
    }
    // Optional: Check for valid characters
    const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    if (!vpaRegex.test(String(value).trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid VPA format",
      });
    }
  }

  next();
};

const validateRiskBlockUpdate = (req, res, next) => {
  const { type, value, isActive } = req.body;

  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Risk block type must be one of: ${VALID_TYPES.join(", ")}`,
    });
  }

  if (value !== undefined && String(value).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Risk block value cannot be empty",
    });
  }

  if (type === "EMAIL" && value !== undefined && !String(value).includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Risk block email is invalid",
    });
  }

  next();
};

module.exports = { validateRiskBlock, validateRiskBlockUpdate };
