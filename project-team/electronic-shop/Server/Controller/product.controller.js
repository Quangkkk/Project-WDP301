const mongoose = require("mongoose");

const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const Brand = require("../models/Brand.model");
const Category = require("../models/Category.model");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const createProduct = async (req, res) => {
  try {
    const {
      brand_id,
      category_id,
      name,
      sku,
      description,
      images,
      price,
      sale_price,
      status,
      is_featured,
    } = req.body;

    if (
      !brand_id ||
      !category_id ||
      !name ||
      !sku ||
      price === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "brand_id, category_id, name, sku and price are required",
      });
    }

    if (
      !isValidObjectId(brand_id) ||
      !isValidObjectId(category_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand_id or category_id",
      });
    }

    const [brand, category] = await Promise.all([
      Brand.findById(brand_id),
      Category.findById(category_id),
    ]);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const existedSku = await Product.findOne({ sku });

    if (existedSku) {
      return res.status(409).json({
        success: false,
        message: "Product SKU already exists",
      });
    }

    const product = await Product.create({
      brand_id,
      category_id,
      name,
      sku,
      description,
      images: Array.isArray(images) ? images : [],
      price,
      sale_price,
      status,
      is_featured,
    });

    return res.status(201).json({
      success: true,
      message: "Create product successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("brand_id", "name logo_img")
      .populate("category_id", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(id)
      .populate("brand_id", "name logo_img")
      .populate("category_id", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await ProductVariant.find({
      product_id: product._id,
    });

    return res.status(200).json({
      success: true,
      data: {
        product,
        variants,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get product",
      error: error.message,
    });
  }
};

const updateProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const allowedFields = [
      "brand_id",
      "category_id",
      "name",
      "sku",
      "description",
      "images",
      "price",
      "sale_price",
      "total_reserved",
      "average_rating",
      "rating_count",
      "status",
      "is_featured",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("brand_id", "name logo_img")
      .populate("category_id", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update product successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await ProductVariant.deleteMany({
      product_id: id,
    });

    return res.status(200).json({
      success: true,
      message: "Delete product successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProductById,
  deleteProductById,
};