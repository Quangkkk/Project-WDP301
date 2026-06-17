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
      trim: true,
      default: null,
    },
    total_cart_addition: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "out_of_stock"],
      default: "active",
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    sale_price: {
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
  },
  { timestamps: true }
);

productSchema.index({ brand_id: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ name: "text", sku: "text" });

module.exports = mongoose.model("Product", productSchema);