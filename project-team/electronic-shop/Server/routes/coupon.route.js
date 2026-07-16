const express = require("express");
const coupon = require("../Controller/coupon.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Route validate yeu cau verifyToken de lay duoc req.user_id check so luot dung cua user do
router.post("/validate", verifyToken, coupon.validateCoupon);

// Cac route quan tri coupon chi danh cho ADMIN va MANAGER
router.post("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), coupon.createCoupon);
router.get("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), coupon.getAllCoupons);
router.get("/usages", verifyToken, authorizeRoles("ADMIN", "MANAGER"), coupon.getCouponUsages);
router.get("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), coupon.getCouponById);
router.put("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), coupon.updateCouponById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), coupon.deleteCouponById);

module.exports = router;