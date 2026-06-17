const mongoose = require("mongoose");
const Brand = require("../models/Brand.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const addBrand = async (req, res) => {
  try {
    const { name, logo_img, img_url, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const data = await Brand.create({ name, logo_img: logo_img || img_url || null, status });
    return res.status(201).json({ success: true, message: "Create brand successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create brand", error: error.message });
  }
};

const getAllBrand = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const data = await Brand.find(filter).select("-__v").sort({ name: 1 });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get brands", error: error.message });
  }
};

const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid brand id" });
    const data = await Brand.findById(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Brand not found" });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get brand", error: error.message });
  }
};

const updateBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid brand id" });

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.logo_img !== undefined || req.body.img_url !== undefined) updateData.logo_img = req.body.logo_img || req.body.img_url;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await Brand.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Brand not found" });
    return res.status(200).json({ success: true, message: "Update brand successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update brand", error: error.message });
  }
};

const deleteBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid brand id" });
    const data = await Brand.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Brand not found" });
    return res.status(200).json({ success: true, message: "Delete brand successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete brand", error: error.message });
  }
};

module.exports = { addBrand, getAllBrand, getBrandById, updateBrandById, deleteBrandById };