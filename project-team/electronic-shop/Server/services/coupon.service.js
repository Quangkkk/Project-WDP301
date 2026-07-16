const Coupon = require("../models/Coupon.model");
const CouponUsage = require("../models/CouponUsage.model");

const normalizeCode = (code) => String(code || "").trim().toUpperCase();

// Tinh toan so tien giam gia thuc te
const calculateDiscount = (coupon, orderAmount) => {
  let discount = coupon.discount_type === "percent"
    ? (orderAmount * coupon.discount_value) / 100
    : coupon.discount_value;

  if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
    discount = Math.min(discount, coupon.max_discount);
  }
  return Math.min(discount, orderAmount);
};

// Them moi coupon
const createCoupon = async (couponData) => {
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
  } = couponData;

  if (!code || !name || !discount_type || discount_value === undefined) {
    throw new Error("code, name, discount_type and discount_value are required");
  }

  return await Coupon.create({
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
};

// Lay danh sach tat ca coupons
const getAllCoupons = async () => {
  return await Coupon.find({}).select("-__v").sort({ created_at: -1 });
};

// Lay chi tiet coupon theo ID
const getCouponById = async (id) => {
  const coupon = await Coupon.findById(id).select("-__v");
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  return coupon;
};

// Cap nhat coupon
const updateCouponById = async (id, updateFields) => {
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
  for (const field of allowedFields) {
    if (updateFields[field] !== undefined) updateData[field] = updateFields[field];
  }
  if (updateFields.starts_at !== undefined && updateData.start_at === undefined) {
    updateData.start_at = updateFields.starts_at;
  }
  if (updateData.code) {
    updateData.code = normalizeCode(updateData.code);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const coupon = await Coupon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
  if (!coupon) {
    throw new Error("Coupon not found");
  }
  return coupon;
};

// Xoa coupon (chi cho xoa neu chua co lich su su dung)
const deleteCouponById = async (id) => {
  const used = await CouponUsage.exists({ coupon_id: id });
  if (used) {
    throw new Error("Coupon has usage history and cannot be deleted");
  }

  const data = await Coupon.findByIdAndDelete(id).select("-__v");
  if (!data) {
    throw new Error("Coupon not found");
  }
  return data;
};

// Kiem tra tinh hop le cua coupon trong Service layer
const validateCoupon = async ({ code, user_id, order_amount }) => {
  if (!code || order_amount === undefined) {
    throw new Error("code and order_amount are required");
  }

  const coupon = await Coupon.findOne({ code: normalizeCode(code) });
  if (!coupon) {
    throw new Error("Coupon not found");
  }

  const now = new Date();
  if (coupon.start_at && coupon.start_at > now) {
    throw new Error("Coupon has not started yet");
  }
  if (coupon.expired_at && coupon.expired_at < now) {
    throw new Error("Coupon has expired");
  }
  if (Number(order_amount) < Number(coupon.min_order_amount || 0)) {
    throw new Error(`Minimum order amount is ${coupon.min_order_amount}`);
  }

  // Tinh tong so luot dung hien tai cua coupon
  const totalUsed = await CouponUsage.aggregate([
    { $match: { coupon_id: coupon._id } },
    { $group: { _id: null, total: { $sum: "$used_count" } } },
  ]);
  const currentTotalUsed = totalUsed[0]?.total || 0;

  if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && currentTotalUsed >= coupon.usage_limit) {
    throw new Error("Coupon usage limit reached");
  }

  // Kiem tra gioi han dung tren moi user
  if (user_id && coupon.usage_limit_per_user !== null && coupon.usage_limit_per_user !== undefined) {
    const usage = await CouponUsage.findOne({ coupon_id: coupon._id, user_id });
    if ((usage?.used_count || 0) >= coupon.usage_limit_per_user) {
      throw new Error("User coupon usage limit reached");
    }
  }

  const discount_amount = calculateDiscount(coupon, Number(order_amount));
  return {
    coupon,
    discount_amount,
    final_amount: Math.max(Number(order_amount) - discount_amount, 0),
  };
};

// Xem danh sach luot dung coupon
const getCouponUsages = async (filterParams) => {
  const filter = {};
  if (filterParams.coupon_id) filter.coupon_id = filterParams.coupon_id;
  if (filterParams.user_id) filter.user_id = filterParams.user_id;

  return await CouponUsage.find(filter)
    .populate("coupon_id", "code name")
    .populate("user_id", "name email")
    .select("-__v")
    .sort({ created_at: -1 });
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCouponById,
  deleteCouponById,
  validateCoupon,
  getCouponUsages,
  calculateDiscount,
  normalizeCode,
};
