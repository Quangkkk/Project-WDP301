const express = require("express");
const manager = require("../Controller/manager.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Tat ca cac route trong router nay yeu cau dang nhap va quyen Manager hoac Admin
router.use(verifyToken, authorizeRoles("Manager", "Admin"));

// Manager xem danh sach Staff
router.get("/staff", manager.getStaffList);

// Manager xem hieu suat cua 1 Staff cu the
router.get("/staff/:id/performance", manager.getStaffPerformance);

module.exports = router;
