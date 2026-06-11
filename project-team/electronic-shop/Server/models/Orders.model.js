const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    shipping_method_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingMethod",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "completed",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },

    payment_method: {
      type: String,
      enum: [
        "cod",
        "bank_transfer",
        "momo",
        "vnpay",
        "card",
        "payos",
      ],
      required: true,
    },

    payment_status: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "unpaid",
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    shipping_fee: {
      type: Number,
      min: 0,
      default: 0,
    },

    discount_amount: {
      type: Number,
      min: 0,
      default: 0,
    },

    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    receiver_name: {
      type: String,
      required: true,
      trim: true,
    },

    receiver_phone: {
      type: String,
      required: true,
      trim: true,
    },

    shipping_province: {
      type: String,
      required: true,
      trim: true,
    },

    shipping_district: {
      type: String,
      required: true,
      trim: true,
    },

    shipping_ward: {
      type: String,
      required: true,
      trim: true,
    },

    shipping_address_line: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      trim: true,
      default: null,
    },

    cancel_reason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.index({ user_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });

module.exports = mongoose.model("Order", orderSchema);