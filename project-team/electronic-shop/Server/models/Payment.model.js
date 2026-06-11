const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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
        "pending",
        "paid",
        "failed",
        "refunded",
        "cancelled",
      ],
      default: "pending",
    },

    transaction_code: {
      type: String,
      trim: true,
      default: null,
    },

    gateway_name: {
      type: String,
      trim: true,
      default: null,
    },

    paid_amount: {
      type: Number,
      min: 0,
      default: 0,
    },

    paid_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ order_id: 1 });
paymentSchema.index(
  { transaction_code: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);