const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: null,
      trim: true,
    },
    images: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    status: {
      type: String,
      default: "visible",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

reviewSchema.index({ product_id: 1 });
reviewSchema.index({ user_id: 1, order_id: 1, product_id: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema, "reviews");
