const crypto = require("crypto");
const prisma = require("../../config/prisma");

const hmacSignatureMiddleware = async (req, res, next) => {
  try {
    // Get signature from header
    const signature = req.headers["x-signature"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "x-signature header is required",
      });
    }

    // Get merchant reference from body
    const merchantReference = req.body.merchantReference;

    if (!merchantReference) {
      return res.status(400).json({
        success: false,
        message: "merchantReference is required for signature verification",
      });
    }

    // Get merchant from database
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.user.merchantId },
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // Check if merchant has clientSecret
    if (!merchant.clientSecret) {
      return res.status(400).json({
        success: false,
        message:
          "Merchant clientSecret not configured. Please contact support.",
      });
    }

    // Generate expected signature using merchant's clientSecret
    const expectedSignature = crypto
      .createHmac("sha256", merchant.clientSecret)
      .update(merchantReference)
      .digest("hex");

    // Compare signatures (case-insensitive)
    if (expectedSignature.toLowerCase() !== signature.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: "Invalid signature",
      });
    }
    next();
  } catch (error) {
    console.error("[HMAC] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Signature verification failed",
    });
  }
};

module.exports = hmacSignatureMiddleware;
