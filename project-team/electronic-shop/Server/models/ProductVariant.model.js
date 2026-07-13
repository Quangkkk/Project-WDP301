const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    variant_value: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    attributes_json: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
    sale_price: {
      type: Number,
      min: 0,
      default: 0,
    },
    stock_quantity: {
      type: Number,
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

productVariantSchema.index({ product_id: 1 });

module.exports = mongoose.model("ProductVariant", productVariantSchema, "product_variants");
