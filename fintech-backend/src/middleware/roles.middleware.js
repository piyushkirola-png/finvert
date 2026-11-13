const authorize = (...allowedRoles) => {
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    // Skip webhooks
    if (
      req.originalUrl.includes("/webhooks/") ||
      req.path.includes("/webhooks/")
    ) {
      return next();
    }

    if (!req.user) {
      console.log("❌ No user found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user found in request",
      });
    }

    // Get userRole from req.user
    const userRole = req.user.role || req.user.userRole;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${userRole} role does not have access. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

module.exports = { authorize };
