const express = require("express");
const role = require("../Controller/role.controller");

const router = express.Router();

router.post("/", role.createRole);
router.get("/", role.getAllRoles);
router.put("/:id", role.updateRoleById);
router.delete("/:id", role.deleteRoleById);
router.post("/:roleId/permissions", role.assignPermission);
router.delete("/:roleId/permissions/:permissionId", role.removePermission);

module.exports = router;