const payinPlaygroundService = require("./api-playground.service");
const { validationResult } = require("express-validator");

const extractUpiIntent = (raw) => {
  if (!raw) return "";

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("upi://")) return trimmed;

    try {
      const parsed = JSON.parse(trimmed);
      return extractUpiIntent(parsed);
    } catch {
      return "";
    }
  }
  
  if (typeof raw === "object") {
    const candidate =
      raw.qr_intent ?? raw.qrIntent ?? raw.intent ?? raw.upiIntent ?? null;
    if (candidate && candidate !== raw) return extractUpiIntent(candidate);
  }

  return "";
};

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

    const upiIntent = extractUpiIntent(result?.intent ?? result?.qr_intent);

    if (!upiIntent) {
      console.warn(
        "[Playground Payin] Could not extract UPI intent. Raw result.intent:",
        result?.intent
      );
    }

    return res.status(201).json({
      success: true,
      data: {
        id: result.id,
        merchantReference: result.merchantReference,
        status: result.status,
        amount: result.amount,
        intent: upiIntent,
      },
    });
  } catch (error) {
    console.error("Playground Payin Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { createPlaygroundPayin };