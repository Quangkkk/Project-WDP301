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

const RETURN_REQUEST_STATUS = [
  "pending",
  "approved",
  "rejected",
  "received",
  "refunded",
];

const returnRequestItemSchema = new mongoose.Schema(
  {
    order_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    variant_value: {
      type: String,
      default: null,
      trim: true,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0,
    },
    purchased_quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

const returnRequestSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: RETURN_REQUEST_STATUS,
      required: true,
      default: "pending",
      trim: true,
    },
    items: {
      type: [returnRequestItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Yêu cầu trả hàng phải có ít nhất một sản phẩm.",
      },
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    requested_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    staff_note: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    order_code: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      match: /^TS-[A-F0-9]{8}$/,
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
    return_request: {
      type: returnRequestSchema,
      default: null,
    },
    handled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    receiver_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email người nhận không hợp lệ."],
    },
    guest_access_token_hash: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

orderSchema.pre("validate", function validateOrderOwner() {
  if (!this.user_id && !this.guest_access_token_hash) {
    this.invalidate(
      "guest_access_token_hash",
      "Đơn hàng guest phải có mã truy cập."
    );
  }
});

orderSchema.index({ order_code: 1 }, { unique: true, sparse: true });
orderSchema.index({ user_id: 1 });
orderSchema.index({ shipping_method_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ "return_request.status": 1 });
orderSchema.index({ created_at: -1 });

module.exports = mongoose.model("Order", orderSchema, "orders");