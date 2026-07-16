const mongoose = require("mongoose");
const couponService = require("../services/coupon.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller them coupon moi
const createCoupon = async (req, res) => {
  try {
    const data = await couponService.createCoupon(req.body);
    return res.status(201).json({ success: true, message: "Create coupon successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("required")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to create coupon", error: error.message });
  }
};

// Controller lay tat ca coupons
const getAllCoupons = async (req, res) => {
  try {
    const data = await couponService.getAllCoupons();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get coupons", error: error.message });
  }
};

// Controller lay chi tiet coupon theo ID
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid coupon id" });
    }

    const data = await couponService.getCouponById(id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Coupon not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to get coupon", error: error.message });
  }
};

// Controller cap nhat coupon theo ID
const updateCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid coupon id" });
    }

    const data = await couponService.updateCouponById(id, req.body);
    return res.status(200).json({ success: true, message: "Update coupon successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Coupon not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to update coupon", error: error.message });
  }
};

// Controller xoa coupon
const deleteCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid coupon id" });
    }

    const data = await couponService.deleteCouponById(id);
    return res.status(200).json({ success: true, message: "Delete coupon successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Coupon not found") {
      statusCode = 404;
    } else if (error.message === "Coupon has usage history and cannot be deleted") {
      statusCode = 409;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to delete coupon", error: error.message });
  }
};

// Controller kiem tra ma giam gia
const validateCoupon = async (req, res) => {
  try {
    const { code, user_id, order_amount } = req.body;

    // Neu user dang nhap thi tu dong lay user_id tu Token
    const activeUserId = user_id || req.user_id;

    if (!code || order_amount === undefined) {
      return res.status(400).json({ success: false, message: "code and order_amount are required" });
    }

    if (activeUserId && !isValidObjectId(activeUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user_id" });
    }

    const data = await couponService.validateCoupon({
      code,
      user_id: activeUserId,
      order_amount,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Coupon not found") {
      statusCode = 404;
    } else if (
      error.message === "Coupon has not started yet" ||
      error.message === "Coupon has expired" ||
      error.message.includes("Minimum order amount") ||
      error.message === "Coupon usage limit reached" ||
      error.message === "User coupon usage limit reached"
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to validate coupon", error: error.message });
  }
};

// Controller xem lich su su dung coupon
const getCouponUsages = async (req, res) => {
  try {
    const { coupon_id, user_id } = req.query;

    if (coupon_id && !isValidObjectId(coupon_id)) {
      return res.status(400).json({ success: false, message: "Invalid coupon_id" });
    }
    if (user_id && !isValidObjectId(user_id)) {
      return res.status(400).json({ success: false, message: "Invalid user_id" });
    }

    const data = await couponService.getCouponUsages({ coupon_id, user_id });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get coupon usages", error: error.message });
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCouponById,
  deleteCouponById,
  validateCoupon,
  getCouponUsages,
};
