const mongoose = require("mongoose");
const Category = require("../models/Category.model");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name is required",
      });
    }

    const category = await Category.create({
      name,
    });

    return res.status(201).json({
      success: true,
      message: "Create category successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

const getAllCategory = async (req, res) => {
  try {
    const categories = await Category.find()
      .select("-createdAt -updatedAt -__v")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Get categories successfully",
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get categories",
      error: error.message,
    });
  }
};

const updateCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    if (name === undefined) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name },
      {
        new: true,
        runValidators: true,
      }
    ).select("-createdAt -updatedAt -__v");

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update category successfully",
      data: updatedCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

const deleteCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    const deletedCategory = await Category.findByIdAndDelete(id).select(
      "-createdAt -updatedAt -__v"
    );

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delete category successfully",
      data: deletedCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

module.exports = {
  addCategory,
  getAllCategory,
  updateCategoryById,
  deleteCategoryById,
};