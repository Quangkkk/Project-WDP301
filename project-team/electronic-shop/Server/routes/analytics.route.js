const express = require("express");
const analytics = require("../controller/analytics.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.get(
  "/revenue",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER"),
  analytics.getRevenueAnalytics
);

module.exports = router;
