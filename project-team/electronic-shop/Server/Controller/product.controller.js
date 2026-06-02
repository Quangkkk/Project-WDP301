const { default: mongoose } = require('mongoose');
const Product = require('../Model/Products.model');

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("brand", "name")
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Get products successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
};

const ProductController = {
    getAllProducts,
}

module.exports = ProductController;
