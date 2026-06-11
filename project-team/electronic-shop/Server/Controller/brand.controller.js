const mongoose = require("mongoose");
const Brand = require("../models/Brand.model");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const addBrand = async (req, res) => {
  try {
    const { name, img_url } = req.body;

    if (!name || !img_url) {
      return res.status(400).json({
        success: false,
        message: "name and img_url are required",
      });
    }

    const brand = await Brand.create({
      name,
      img_url,
    });

    return res.status(201).json({
      success: true,
      message: "Create brand successfully",
      data: brand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create brand",
      error: error.message,
    });
  }
};

const getAllBrand = async (req, res) => {
  try {
    const brands = await Brand.find()
      .select("-createdAt -updatedAt -__v")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Get brands successfully",
      count: brands.length,
      data: brands,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get brands",
      error: error.message,
    });
  }
};

const updateBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, img_url } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand id",
      });
    }

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (img_url !== undefined) {
      updateData.img_url = img_url;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    const updatedBrand = await Brand.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-createdAt -updatedAt -__v");

    if (!updatedBrand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update brand successfully",
      data: updatedBrand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update brand",
      error: error.message,
    });
  }
};

const deleteBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand id",
      });
    }

    const deletedBrand = await Brand.findByIdAndDelete(id).select(
      "-createdAt -updatedAt -__v"
    );

    if (!deletedBrand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delete brand successfully",
      data: deletedBrand,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete brand",
      error: error.message,
    });
  }
};

module.exports = {
  addBrand,
  getAllBrand,
  updateBrandById,
  deleteBrandById,
};