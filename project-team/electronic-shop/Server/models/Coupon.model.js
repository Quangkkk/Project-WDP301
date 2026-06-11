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

    used_count: {
      type: Number,
      min: 0,
      default: 0,
    },

    start_date: {
      type: Date,
      default: null,
    },

    end_date: {
      type: Date,
      default: null,
    },

    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);