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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShippingMethod", shippingMethodSchema);