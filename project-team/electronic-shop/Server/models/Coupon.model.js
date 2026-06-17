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
      trim: true,
      default: null,
    },
    discount_type: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    max_discount: {
      type: Number,
      min: 0,
      default: null,
    },
    min_order_amount: {
      type: Number,
      min: 0,
      default: 0,
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
    starts_at: {
      type: Date,
      default: null,
    },
    expired_at: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);