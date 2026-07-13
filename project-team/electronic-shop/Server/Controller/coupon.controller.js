const mongoose = require("mongoose");

const Coupon = require("../models/Coupon.model");
const CouponUsage = require("../models/CouponUsage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const calculateDiscount = (coupon, orderAmount) => {
  let discount = coupon.discount_type === "percent" ? (orderAmount * coupon.discount_value) / 100 : coupon.discount_value;
  if (coupon.max_discount !== null && coupon.max_discount !== undefined) discount = Math.min(discount, coupon.max_discount);
  return Math.min(discount, orderAmount);
};

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount,
      usage_limit,
      usage_limit_per_user,
      start_at,
      starts_at,
      expired_at,
    } = req.body;

    if (!code || !name || !discount_type || discount_value === undefined) {
      return res.status(400).json({ success: false, message: "code, name, discount_type and discount_value are required" });
    }

    const data = await Coupon.create({
      code: normalizeCode(code),
      name,
      description,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount,
      usage_limit,
      usage_limit_per_user,
      start_at: start_at || starts_at || null,
      expired_at,
    });

    return res.status(201).json({ success: true, message: "Create coupon successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create coupon", error: error.message });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const data = await Coupon.find({}).select("-__v").sort({ created_at: -1 });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get coupons", error: error.message });
  }
};

const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid coupon id" });

    const data = await Coupon.findById(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get coupon", error: error.message });
  }
};

const updateCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid coupon id" });

    const allowedFields = [
      "code",
      "name",
      "description",
      "discount_type",
      "discount_value",
      "min_order_amount",
      "max_discount",
      "usage_limit",
      "usage_limit_per_user",
      "start_at",
      "expired_at",
    ];

    const updateData = {};
    for (const field of allowedFields) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    if (req.body.starts_at !== undefined && updateData.start_at === undefined) updateData.start_at = req.body.starts_at;
    if (updateData.code) updateData.code = normalizeCode(updateData.code);

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await Coupon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.status(200).json({ success: true, message: "Update coupon successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update coupon", error: error.message });
  }
};

const deleteCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid coupon id" });

    const used = await CouponUsage.exists({ coupon_id: id });
    if (used) return res.status(409).json({ success: false, message: "Coupon has usage history and cannot be deleted" });

    const data = await Coupon.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Coupon not found" });
    return res.status(200).json({ success: true, message: "Delete coupon successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete coupon", error: error.message });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, user_id, order_amount } = req.body;
    if (!code || order_amount === undefined) return res.status(400).json({ success: false, message: "code and order_amount are required" });

    const coupon = await Coupon.findOne({ code: normalizeCode(code) });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    const now = new Date();
    if (coupon.start_at && coupon.start_at > now) return res.status(400).json({ success: false, message: "Coupon has not started yet" });
    if (coupon.expired_at && coupon.expired_at < now) return res.status(400).json({ success: false, message: "Coupon has expired" });
    if (Number(order_amount) < Number(coupon.min_order_amount || 0)) {
      return res.status(400).json({ success: false, message: `Minimum order amount is ${coupon.min_order_amount}` });
    }

    const totalUsed = await CouponUsage.aggregate([
      { $match: { coupon_id: coupon._id } },
      { $group: { _id: null, total: { $sum: "$used_count" } } },
    ]);
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && (totalUsed[0]?.total || 0) >= coupon.usage_limit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    if (user_id && coupon.usage_limit_per_user !== null && coupon.usage_limit_per_user !== undefined) {
      if (!isValidObjectId(user_id)) return res.status(400).json({ success: false, message: "Invalid user_id" });
      const usage = await CouponUsage.findOne({ coupon_id: coupon._id, user_id });
      if ((usage?.used_count || 0) >= coupon.usage_limit_per_user) {
        return res.status(400).json({ success: false, message: "User coupon usage limit reached" });
      }
    }

    const discount_amount = calculateDiscount(coupon, Number(order_amount));
    return res.status(200).json({ success: true, data: { coupon, discount_amount, final_amount: Number(order_amount) - discount_amount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to validate coupon", error: error.message });
  }
};

const getCouponUsages = async (req, res) => {
  try {
    const filter = {};
    if (req.query.coupon_id) filter.coupon_id = req.query.coupon_id;
    if (req.query.user_id) filter.user_id = req.query.user_id;

    const data = await CouponUsage.find(filter)
      .populate("coupon_id", "code name")
      .populate("user_id", "name email")
      .select("-__v")
      .sort({ created_at: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get coupon usages", error: error.message });
  }
};

module.exports = { createCoupon, getAllCoupons, getCouponById, updateCouponById, deleteCouponById, validateCoupon, getCouponUsages };
