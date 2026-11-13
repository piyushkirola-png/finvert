const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// DEFAULT LIMITER - 1000 requests per 60 seconds
const defaultLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.RATE_LIMIT_SKIP_WEBHOOKS === "true") {
      if (
        req.path.includes("/webhooks/") ||
        req.originalUrl.includes("/webhooks/") ||
        req.path.includes("/chargebacks/webhook") ||
        req.path.includes("/refunds/webhook")
      ) {
        return true;
      }
    }
    return false;
  },
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// AUTH LIMITER - 500 requests per 60 seconds
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 500,
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again after 60 seconds.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// PAYMENT LIMITER - 500 requests per 60 seconds
const paymentLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX) || 500,
  message: {
    success: false,
    message: "Too many payment requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a moment and try again.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// STRICT LIMITER - 10 requests per 60 seconds
const strictLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests for this sensitive operation.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a moment.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// SKIP LIMITER - for health checks
const skipLimiter = (req, res, next) => {
  if (req.path === "/health" || req.path === "/") {
    return next();
  }
  return defaultLimiter(req, res, next);
};

// EXPORTS
module.exports = {
  defaultLimiter,
  authLimiter,
  paymentLimiter,
  strictLimiter,
  skipLimiter,
};
