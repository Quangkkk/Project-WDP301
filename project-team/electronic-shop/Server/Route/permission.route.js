const express = require("express");
const permission = require("../Controller/permission.controller");

const router = express.Router();

router.post("/", permission.createPermission);
router.get("/", permission.getAllPermissions);
router.put("/:id", permission.updatePermissionById);
router.delete("/:id", permission.deletePermissionById);

module.exports = router;