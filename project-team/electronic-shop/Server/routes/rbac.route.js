const express = require("express");
const rbac = require("../Controller/rbac.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Tat ca cac route trong router nay chi co Admin moi co quyen thuc thi
router.use(verifyToken, authorizeRoles("Admin"));

// 1. Quan ly Roles
router.get("/roles", rbac.getRoles);
router.post("/roles", rbac.createRole);
router.put("/roles/:id", rbac.updateRole);
router.delete("/roles/:id", rbac.deleteRole);

// 2. Quan ly Permissions
router.get("/permissions", rbac.getPermissions);
router.post("/permissions", rbac.createPermission);
router.put("/permissions/:id", rbac.updatePermission);
router.delete("/permissions/:id", rbac.deletePermission);

// 3. Mapping Quyen - Vai tro
router.get("/roles/:roleId/permissions", rbac.getRolePermissions);
router.post("/roles/:roleId/permissions", rbac.assignPermissionToRole);
router.delete("/roles/:roleId/permissions/:permissionId", rbac.removePermissionFromRole);

// 4. Quan ly User (Active/Deactive & Change Role)
router.patch("/users/:id/status", rbac.updateUserStatus);
router.patch("/users/:id/role", rbac.updateUserRole);

module.exports = router;
