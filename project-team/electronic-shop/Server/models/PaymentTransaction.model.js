const mongoose = require("mongoose");

const PAYMENT_PROVIDERS = ["cod", "bank_transfer", "zalopay"];

const PAYMENT_TRANSACTION_STATUS = [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
];

const paymentTransactionSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: PAYMENT_TRANSACTION_STATUS,
      default: "pending",
      trim: true,
      index: true,
    },

    payment_code: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    transaction_ref: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    provider_order_id: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    payment_url: {
      type: String,
      default: null,
      trim: true,
    },

    qr_url: {
      type: String,
      default: null,
      trim: true,
    },

    bank_code: {
      type: String,
      default: null,
      trim: true,
    },

    account_no: {
      type: String,
      default: null,
      trim: true,
    },

    account_name: {
      type: String,
      default: null,
      trim: true,
    },

    transfer_content: {
      type: String,
      default: null,
      trim: true,
    },

    paid_at: {
      type: Date,
      default: null,
    },

    raw_response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  }
);

paymentTransactionSchema.index(
  {
    order_id: 1,
    provider: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "PaymentTransaction",
  paymentTransactionSchema,
  "payment_transactions"
);