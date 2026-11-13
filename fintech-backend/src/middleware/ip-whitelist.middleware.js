const prisma = require("../../config/prisma");

const ipWhitelistMiddleware = async (req, res, next) => {
  try {
    if (req.originalUrl.includes("/webhooks/")) {
      return next();
    }

    const user = req.user;

    if (!user || user.role !== "USER") {
      return next();
    }

    if (!user.merchantId) {
      return res.status(403).json({
        success: false,
        message: "No merchant associated with this user",
      });
    }

    // Get client IP
    let clientIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.connection?.remoteAddress ||
      "";

    // Normalize IP
    if (clientIp === "::1" || clientIp === "::ffff:127.0.0.1") {
      clientIp = "127.0.0.1";
    }
    if (clientIp.startsWith("::ffff:")) {
      clientIp = clientIp.substring(7);
    }

    // Fetch merchant's whitelist
    const merchant = await prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { ipWhitelist: true },
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant not found",
      });
    }

    // If whitelist is empty, allow all
    if (!merchant.ipWhitelist || merchant.ipWhitelist.length === 0) {
      return next();
    }

    // Check if IP is whitelisted
    if (!merchant.ipWhitelist.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        message: `IP ${clientIp} is not whitelisted for this merchant account`,
      });
    }

    next();
  } catch (error) {
    console.error("IP Whitelist Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "IP whitelist check failed",
    });
  }
};

module.exports = { ipWhitelistMiddleware };
