const express = require("express");
const role = require("../controller/role.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("ADMIN"), role.createRole);
router.get("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), role.getAllRoles);
router.put("/:id", verifyToken, authorizeRoles("ADMIN"), role.updateRoleById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), role.deleteRoleById);

module.exports = router;