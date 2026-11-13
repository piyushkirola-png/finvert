const payoutPlaygroundService = require("./api-playground.service");
const { validationResult } = require("express-validator");

const createPlaygroundPayout = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const requestData = { ...req.body };

    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res
          .status(403)
          .json({ success: false, message: "No merchant associated" });
      }
      requestData.merchantId = req.user.merchantId;
      requestData.userId = req.user.id;
    }

    const result = await payoutPlaygroundService.createPlaygroundPayout(
      requestData,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.headers["x-device-id"],
        geolocation: req.headers["x-geolocation"],
      },
      req.user,
    );

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Playground Payout Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { createPlaygroundPayout };
