const express = require("express");
const coupon = require("../controller/coupon.controller");

const router = express.Router();

router.post("/", coupon.createCoupon);
router.post("/validate", coupon.validateCoupon);
router.get("/", coupon.getAllCoupons);
router.get("/usages", coupon.getCouponUsages);
router.get("/:id", coupon.getCouponById);
router.put("/:id", coupon.updateCouponById);
router.delete("/:id", coupon.deleteCouponById);

module.exports = router;