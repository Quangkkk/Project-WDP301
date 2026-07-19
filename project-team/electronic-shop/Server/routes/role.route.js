const express = require("express");
const role = require("../Controller/role.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.get("/", verifyToken, authorizeRoles("ADMIN"), role.getAllRoles);

module.exports = router;