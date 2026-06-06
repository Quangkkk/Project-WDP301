const mongoose = require("mongoose");
const ProductDetail = require("../Model/ProductDetail.model");
const Product = require("../Model/Product.model");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const addProductDetail = async (req, res) => {
  try {
    const { chip, memory, RAM, SIM, screen_size, color } = req.body;

    if (!chip || !memory || !RAM || !SIM || !screen_size || !color) {
      return res.status(400).json({
        success: false,
        message: "chip, memory, RAM, SIM, screen_size and color are required",
      });
    }

    const productDetail = await ProductDetail.create({
      chip,
      memory,
      RAM,
      SIM,
      screen_size,
      color,
    });

    return res.status(201).json({
      success: true,
      message: "Create product detail successfully",
      data: productDetail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create product detail",
      error: error.message,
    });
  }
};

const getAllProductDetails = async (req, res) => {
  try {
    const productDetails = await ProductDetail.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Get product details successfully",
      count: productDetails.length,
      data: productDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get product details",
      error: error.message,
    });
  }
};

const getProductDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product detail id",
      });
    }

    const productDetail = await ProductDetail.findById(id);

    if (!productDetail) {
      return res.status(404).json({
        success: false,
        message: "Product detail not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get product detail successfully",
      data: productDetail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get product detail",
      error: error.message,
    });
  }
};

const updateProductDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product detail id",
      });
    }

    const updateData = {};

    const { chip, memory, RAM, SIM, screen_size, color } = req.body;

    if (chip !== undefined) updateData.chip = chip;
    if (memory !== undefined) updateData.memory = memory;
    if (RAM !== undefined) updateData.RAM = RAM;
    if (SIM !== undefined) updateData.SIM = SIM;
    if (screen_size !== undefined) updateData.screen_size = screen_size;
    if (color !== undefined) updateData.color = color;

    const updatedProductDetail = await ProductDetail.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProductDetail) {
      return res.status(404).json({
        success: false,
        message: "Product detail not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update product detail successfully",
      data: updatedProductDetail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update product detail",
      error: error.message,
    });
  }
};

const deleteProductDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product detail id",
      });
    }

    const deletedProductDetail = await ProductDetail.findByIdAndDelete(id);

    if (!deletedProductDetail) {
      return res.status(404).json({
        success: false,
        message: "Product detail not found",
      });
    }

    await Product.updateMany(
      { product_detail_id: id },
      { $unset: { product_detail_id: "" } }
    );

    return res.status(200).json({
      success: true,
      message: "Delete product detail successfully",
      data: deletedProductDetail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete product detail",
      error: error.message,
    });
  }
};

module.exports = {
  addProductDetail,
  getAllProductDetails,
  getProductDetailById,
  updateProductDetailById,
  deleteProductDetailById,
};