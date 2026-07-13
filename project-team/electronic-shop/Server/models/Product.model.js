const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    total_review: {
      type: Number,
      min: 0,
      default: 0,
    },
    average_rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    rating_count: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      default: "active",
      trim: true,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

productSchema.index({ brand_id: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ name: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema, "products");
