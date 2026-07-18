const mongoose = require("mongoose");
const categoryService = require("../services/category.service");

// Helper check ObjectId hop le
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller tao danh muc moi (Admin/Manager)
const addCategory = async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const data = await categoryService.addCategory({ name, status });
    return res.status(201).json({ success: true, message: "Create category successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create category", error: error.message });
  }
};

// Controller lay danh sach danh muc
const getAllCategory = async (req, res) => {
  try {
    const data = await categoryService.getAllCategory(req.query);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get categories", error: error.message });
  }
};

// Controller lay chi tiet danh muc theo ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }

    const data = await categoryService.getCategoryById(id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Category not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to get category", error: error.message });
  }
};

// Controller cap nhat danh muc theo ID (Admin/Manager)
const updateCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }

    const data = await categoryService.updateCategoryById(id, req.body);
    return res.status(200).json({ success: true, message: "Update category successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Category not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to update category", error: error.message });
  }
};

// Controller xoa danh muc theo ID (Admin/Manager)
const deleteCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }

    const data = await categoryService.deleteCategoryById(id);
    return res.status(200).json({ success: true, message: "Delete category successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Category not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to delete category", error: error.message });
  }
};

module.exports = {
  addCategory,
  getAllCategory,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
};