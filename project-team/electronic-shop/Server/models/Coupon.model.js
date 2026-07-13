const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    discount_type: {
      type: String,
      required: true,
      trim: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    min_order_amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    max_discount: {
      type: Number,
      min: 0,
      default: null,
    },
    usage_limit: {
      type: Number,
      min: 0,
      default: null,
    },
    usage_limit_per_user: {
      type: Number,
      min: 0,
      default: null,
    },
    start_at: {
      type: Date,
      default: null,
    },
    expired_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

module.exports = mongoose.model("Coupon", couponSchema, "coupons");
