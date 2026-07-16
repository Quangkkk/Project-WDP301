const Brand = require("../models/Brand.model");

// Them thuong hieu moi
const addBrand = async ({ name, logo_img, img_url, status }) => {
  if (!name) {
    throw new Error("name is required");
  }
  return await Brand.create({
    name,
    logo_img: logo_img || img_url || null,
    status,
  });
};

// Lay danh sach thuong hieu
const getAllBrand = async (queryParams) => {
  const filter = queryParams.status ? { status: queryParams.status } : {};
  return await Brand.find(filter).select("-__v").sort({ name: 1 });
};

// Lay chi tiet thuong hieu theo ID
const getBrandById = async (id) => {
  const brand = await Brand.findById(id).select("-__v");
  if (!brand) {
    throw new Error("Brand not found");
  }
  return brand;
};

// Cap nhat thuong hieu theo ID
const updateBrandById = async (id, updateFields) => {
  const updateData = {};
  if (updateFields.name !== undefined) updateData.name = updateFields.name;
  if (updateFields.logo_img !== undefined || updateFields.img_url !== undefined) {
    updateData.logo_img = updateFields.logo_img || updateFields.img_url;
  }
  if (updateFields.status !== undefined) updateData.status = updateFields.status;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const brand = await Brand.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
  if (!brand) {
    throw new Error("Brand not found");
  }
  return brand;
};

// Xoa thuong hieu theo ID
const deleteBrandById = async (id) => {
  const brand = await Brand.findByIdAndDelete(id).select("-__v");
  if (!brand) {
    throw new Error("Brand not found");
  }
  return brand;
};

module.exports = {
  addBrand,
  getAllBrand,
  getBrandById,
  updateBrandById,
  deleteBrandById,
};
