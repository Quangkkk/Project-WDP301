const mongoose = require("mongoose");

const shippingMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    base_fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    estimate_days: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

module.exports = mongoose.model("ShippingMethod", shippingMethodSchema, "shipping_methods");
