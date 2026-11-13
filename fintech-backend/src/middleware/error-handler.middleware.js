// ERROR TYPES
const ERROR_TYPES = {
  VALIDATION: "ValidationError",
  AUTH: "AuthenticationError",
  FORBIDDEN: "ForbiddenError",
  NOT_FOUND: "NotFoundError",
  DUPLICATE: "DuplicateError",
  DATABASE: "DatabaseError",
  GATEWAY: "GatewayError",
  RATE_LIMIT: "RateLimitError",
  UNKNOWN: "UnknownError",
};

// HTTP STATUS CODES
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

// CLASSIFY ERROR TYPE
const classifyError = (error) => {
  const message = error.message?.toLowerCase() || "";

  // Validation errors
  if (
    error.name === "ValidationError" ||
    error.name === "ValidatorError" ||
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("must be")
  ) {
    return ERROR_TYPES.VALIDATION;
  }

  // Authentication errors
  if (
    error.name === "UnauthorizedError" ||
    error.name === "JsonWebTokenError" ||
    message.includes("unauthorized") ||
    message.includes("token") ||
    message.includes("login") ||
    message.includes("credentials") ||
    message.includes("authenticate")
  ) {
    return ERROR_TYPES.AUTH;
  }

  // Forbidden errors
  if (
    error.name === "ForbiddenError" ||
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("access denied") ||
    message.includes("not allowed")
  ) {
    return ERROR_TYPES.FORBIDDEN;
  }

  // Not found errors
  if (
    error.name === "NotFoundError" ||
    message.includes("not found") ||
    message.includes("does not exist")
  ) {
    return ERROR_TYPES.NOT_FOUND;
  }

  // Duplicate errors (Prisma P2002)
  if (
    error.code === "P2002" ||
    message.includes("duplicate") ||
    message.includes("already exists")
  ) {
    return ERROR_TYPES.DUPLICATE;
  }

  // Rate limit errors
  if (
    error.name === "RateLimitError" ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    return ERROR_TYPES.RATE_LIMIT;
  }

  // Gateway errors
  if (
    message.includes("gateway") ||
    message.includes("timeout") ||
    message.includes("connection refused") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ENOTFOUND")
  ) {
    return ERROR_TYPES.GATEWAY;
  }

  // Database errors (Prisma)
  if (
    error.code?.startsWith("P") ||
    message.includes("prisma") ||
    message.includes("database")
  ) {
    return ERROR_TYPES.DATABASE;
  }

  return ERROR_TYPES.UNKNOWN;
};

// GET HTTP STATUS FOR ERROR TYPE
const getHttpStatus = (errorType) => {
  const statusMap = {
    [ERROR_TYPES.VALIDATION]: HTTP_STATUS.BAD_REQUEST,
    [ERROR_TYPES.AUTH]: HTTP_STATUS.UNAUTHORIZED,
    [ERROR_TYPES.FORBIDDEN]: HTTP_STATUS.FORBIDDEN,
    [ERROR_TYPES.NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
    [ERROR_TYPES.DUPLICATE]: HTTP_STATUS.CONFLICT,
    [ERROR_TYPES.RATE_LIMIT]: HTTP_STATUS.TOO_MANY_REQUESTS,
    [ERROR_TYPES.GATEWAY]: HTTP_STATUS.BAD_GATEWAY,
    [ERROR_TYPES.DATABASE]: HTTP_STATUS.INTERNAL_SERVER,
    [ERROR_TYPES.UNKNOWN]: HTTP_STATUS.INTERNAL_SERVER,
  };
  return statusMap[errorType] || HTTP_STATUS.INTERNAL_SERVER;
};

// GET USER FRIENDLY MESSAGE
const getUserMessage = (error, errorType) => {
  // Use error message if it's user-friendly
  const message = error.message || "Something went wrong";

  // For internal errors, return generic message
  if (
    errorType === ERROR_TYPES.DATABASE ||
    errorType === ERROR_TYPES.GATEWAY ||
    errorType === ERROR_TYPES.UNKNOWN
  ) {
    return "Something went wrong. Please try again later.";
  }

  return message;
};

// GET DEVELOPMENT DETAILS
const getDevDetails = (error, req) => {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) return {};

  return {
    stack: error.stack,
    name: error.name,
    code: error.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
  };
};

// MAIN ERROR HANDLER
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error(`[ERROR] ${err.message}`);
  console.error(`[ERROR] Path: ${req.path}`);
  console.error(`[ERROR] Method: ${req.method}`);
  console.error(`[ERROR] Stack:`, err.stack);

  // Classify the error
  const errorType = classifyError(err);
  const statusCode = getHttpStatus(errorType);
  const userMessage = getUserMessage(err, errorType);

  // Build response
  const response = {
    success: false,
    message: userMessage,
    errorType: errorType,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Add validation details if available
  if (errorType === ERROR_TYPES.VALIDATION && err.details) {
    response.details = err.details;
  }

  // Add duplicate field info
  if (errorType === ERROR_TYPES.DUPLICATE && err.meta?.target) {
    response.field = err.meta.target;
  }

  // Add development details
  const devDetails = getDevDetails(err, req);
  if (Object.keys(devDetails).length > 0) {
    response.dev = devDetails;
  }

  // Send response
  res.status(statusCode).json(response);
};

// SPECIFIC ERROR HANDLERS

// 404 Not Found Handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    errorType: ERROR_TYPES.NOT_FOUND,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};

// Async Handler - wraps async functions
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// EXPORTS
module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ERROR_TYPES,
  HTTP_STATUS,
};
