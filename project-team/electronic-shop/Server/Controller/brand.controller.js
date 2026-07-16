const mongoose = require("mongoose");
const brandService = require("../services/brand.service");

// Helper check ObjectId hop le
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller them thuong hieu moi (Admin/Manager)
const addBrand = async (req, res) => {
  try {
    const { name, logo_img, img_url, status } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const data = await brandService.addBrand({ name, logo_img, img_url, status });
    return res.status(201).json({ success: true, message: "Create brand successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create brand", error: error.message });
  }
};

// Controller lay danh sach thuong hieu
const getAllBrand = async (req, res) => {
  try {
    const data = await brandService.getAllBrand(req.query);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get brands", error: error.message });
  }
};

// Controller lay chi tiet thuong hieu theo ID
const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid brand id" });
    }

    const data = await brandService.getBrandById(id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Brand not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to get brand", error: error.message });
  }
};

// Controller cap nhat thuong hieu theo ID (Admin/Manager)
const updateBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid brand id" });
    }

    const data = await brandService.updateBrandById(id, req.body);
    return res.status(200).json({ success: true, message: "Update brand successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Brand not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to update brand", error: error.message });
  }
};

// Controller xoa thuong hieu theo ID (Admin/Manager)
const deleteBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid brand id" });
    }

    const data = await brandService.deleteBrandById(id);
    return res.status(200).json({ success: true, message: "Delete brand successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Brand not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to delete brand", error: error.message });
  }
};

module.exports = {
  addBrand,
  getAllBrand,
  getBrandById,
  updateBrandById,
  deleteBrandById,
};