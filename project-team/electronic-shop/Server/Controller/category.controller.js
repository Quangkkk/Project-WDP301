const mongoose = require("mongoose");
const Category = require("../models/Category.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const addCategory = async (req, res) => {
  try {
    const { name, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const data = await Category.create({ name, status });
    return res.status(201).json({ success: true, message: "Create category successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create category", error: error.message });
  }
};

const getAllCategory = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const data = await Category.find(filter).select("-__v").sort({ name: 1 });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get categories", error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid category id" });
    const data = await Category.findById(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get category", error: error.message });
  }
};

const updateCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid category id" });

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await Category.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, message: "Update category successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update category", error: error.message });
  }
};

const deleteCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid category id" });
    const data = await Category.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, message: "Delete category successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete category", error: error.message });
  }
};

module.exports = { addCategory, getAllCategory, getCategoryById, updateCategoryById, deleteCategoryById };