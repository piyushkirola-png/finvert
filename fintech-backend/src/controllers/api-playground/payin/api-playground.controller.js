const payinPlaygroundService = require("./api-playground.service");
const { validationResult } = require("express-validator");

const createPlaygroundPayin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const requestData = { ...req.body };

    // Attach merchant and user securely
    if (req.user.role === "USER") {
      if (!req.user.merchantId) {
        return res.status(403).json({ success: false, message: "No merchant associated" });
      }
      requestData.merchantId = req.user.merchantId;
      requestData.userId = req.user.id;
    }

    const result = await payinPlaygroundService.createPlaygroundPayin(
      requestData,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        deviceId: req.headers["x-device-id"],
        geolocation: req.headers["x-geolocation"],
      },
      req.user
    );

    // Your real service returns the intent string for UPI
    const upiIntent = result.intent || "";
    
    // Generate QR Base64 URL using a QR code library (see frontend notes)
    // For the backend, we just return the raw data.
    return res.status(201).json({
      success: true,
      data: {
        id: result.id,
        merchantReference: result.merchantReference,
        status: result.status,
        amount: result.amount,
        intent: upiIntent, 
      }
    });
  } catch (error) {
    console.error("Playground Payin Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { createPlaygroundPayin };