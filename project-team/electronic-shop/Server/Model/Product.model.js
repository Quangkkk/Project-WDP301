const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    img_url: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    product_detail_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductDetail",
      required: false,
      unique: true,
      sparse: true,
      default: undefined,
    },

    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: false,
      default: undefined,
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;