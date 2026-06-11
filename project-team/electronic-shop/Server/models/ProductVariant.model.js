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

    variant_name: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      trim: true,
      default: null,
    },

    storage: {
      type: String,
      trim: true,
      default: null,
    },

    ram: {
      type: String,
      trim: true,
      default: null,
    },

    attributes_json: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    images: {
      type: [String],
      default: [],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
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

    reserved_quantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productVariantSchema.index({ product_id: 1 });

module.exports = mongoose.model(
  "ProductVariant",
  productVariantSchema
);