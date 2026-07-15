const express = require("express");
const coupon = require("../controller/coupon.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("MANAGER"), coupon.createCoupon);
router.post("/validate", coupon.validateCoupon);
router.get("/", verifyToken, authorizeRoles("MANAGER"), coupon.getAllCoupons);
router.get("/usages", verifyToken, authorizeRoles("MANAGER"), coupon.getCouponUsages);
router.get("/:id", verifyToken, authorizeRoles("MANAGER"), coupon.getCouponById);
router.put("/:id", verifyToken, authorizeRoles("MANAGER"), coupon.updateCouponById);
router.delete("/:id", verifyToken, authorizeRoles("MANAGER"), coupon.deleteCouponById);

module.exports = router;