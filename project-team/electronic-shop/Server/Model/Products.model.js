const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    shortDescription: String,
    description: String,
    images: [
      {
        url: String,
        alt: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "VND",
    },
    stock: {
      quantity: {
        type: Number,
        default: 0,
      },
      reserved: {
        type: Number,
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 5,
      },
    },
    specs: {
      type: Object,
      default: {},
    },
    variants: [
      {
        sku: String,
        attributes: {
          color: String,
          storage: String,
        },
        price: Number,
        salePrice: Number,
        stockQuantity: Number,
        images: [String],
      },
    ],
    rating: {
      average: {
        type: Number,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    tags: [String],
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock"],
      default: "active",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
