const mongoose = require("mongoose");

const couponUsageSchema = new mongoose.Schema(
  {
    coupon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    used_count: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { timestamps: true }
);

couponUsageSchema.index(
  {
    coupon_id: 1,
    user_id: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "CouponUsage",
  couponUsageSchema
);