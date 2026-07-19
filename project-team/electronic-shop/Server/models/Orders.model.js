const mongoose = require("mongoose");

const ORDER_STATUS = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
  "cancelled",
];

const PAYMENT_STATUS = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
];

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
      default: null,
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
    address_province: {
      type: String,
      required: true,
      trim: true,
    },
    address_ward: {
      type: String,
      required: true,
      trim: true,
    },
    address_district: {
      type: String,
      required: true,
      trim: true,
    },
    address_address_line: {
      type: String,
      required: true,
      trim: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      default: "pending",
      trim: true,
    },
    payment_method: {
      type: String,
      required: true,
      default: "cod",
      trim: true,
    },
    payment_status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "unpaid",
      trim: true,
    },
    coupon_code: {
      type: String,
      default: null,
      trim: true,
    },
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    cancel_reason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    handled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

orderSchema.index({ user_id: 1 });
orderSchema.index({ shipping_method_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ created_at: -1 });

module.exports = mongoose.model("Order", orderSchema, "orders");