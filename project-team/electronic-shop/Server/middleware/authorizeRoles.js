const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = String(req.role || req.user?.role || "").toUpperCase();

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      String(role).toUpperCase()
    );

    // Debugging logs for role authorization
    try {
      console.log("[authorizeRoles] userRole=", userRole, "allowed=", normalizedAllowedRoles, "req.role=", req.role, "req.user.role=", req.user?.role)
    } catch (e) {
      // ignore
    }

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "Access denied. User role is missing.",
      });
    }

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission.",
      });
    }

    next();
  };
};

module.exports = authorizeRoles;