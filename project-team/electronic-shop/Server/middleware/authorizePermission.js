const rbacService = require("../services/rbac.service");
const RolePermission = require("../models/RolePermission.model");

// Middleware kiem tra quyen thuc thi API dua tren code quyen han
const authorizePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      const roleId = req.role_id; // Lay tu verifyToken middleware
      if (!roleId) {
        return res.status(401).json({ success: false, message: "Unauthorized. Role is missing in token context" });
      }

      // Check cache truoc
      let permissionsSet = rbacService.permissionCache.get(String(roleId));

      if (!permissionsSet) {
        // Neu chua co trong cache, query DB va nap vao cache
        const mappings = await RolePermission.find({ role_id: roleId })
          .populate("permission_id", "code")
          .lean();

        const codes = mappings
          .map((m) => m.permission_id?.code)
          .filter(Boolean)
          .map((c) => c.toUpperCase());

        permissionsSet = new Set(codes);
        rbacService.permissionCache.set(String(roleId), permissionsSet);
      }

      // Kiem tra xem role co chua quyen yeu cau
      if (!permissionsSet.has(permissionCode.toUpperCase())) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have permission: ${permissionCode}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to authorize permission",
        error: error.message,
      });
    }
  };
};

module.exports = authorizePermission;
