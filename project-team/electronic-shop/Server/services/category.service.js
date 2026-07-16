const Category = require("../models/Category.model");

// Them danh muc moi
const addCategory = async ({ name, status }) => {
  if (!name) {
    throw new Error("name is required");
  }
  return await Category.create({ name, status });
};

// Lay danh sach danh muc
const getAllCategory = async (queryParams) => {
  const filter = queryParams.status ? { status: queryParams.status } : {};
  return await Category.find(filter).select("-__v").sort({ name: 1 });
};

// Lay chi tiet danh muc theo ID
const getCategoryById = async (id) => {
  const category = await Category.findById(id).select("-__v");
  if (!category) {
    throw new Error("Category not found");
  }
  return category;
};

// Cap nhat danh muc theo ID
const updateCategoryById = async (id, updateFields) => {
  const updateData = {};
  if (updateFields.name !== undefined) updateData.name = updateFields.name;
  if (updateFields.status !== undefined) updateData.status = updateFields.status;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const category = await Category.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
  if (!category) {
    throw new Error("Category not found");
  }
  return category;
};

// Xoa danh muc theo ID
const deleteCategoryById = async (id) => {
  const category = await Category.findByIdAndDelete(id).select("-__v");
  if (!category) {
    throw new Error("Category not found");
  }
  return category;
};

module.exports = {
  addCategory,
  getAllCategory,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
};
