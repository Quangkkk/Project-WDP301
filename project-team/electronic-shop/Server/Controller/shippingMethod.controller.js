const mongoose = require("mongoose");
const ShippingMethod = require("../models/ShippingMethod.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createShippingMethod = async (req, res) => {
  try {
    const { name, base_fee, estimate_days, estimated_days, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const data = await ShippingMethod.create({ name, base_fee, estimate_days: estimate_days ?? estimated_days ?? 0, status });
    return res.status(201).json({ success: true, message: "Create shipping method successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create shipping method", error: error.message });
  }
};

const getAllShippingMethods = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const data = await ShippingMethod.find(filter).select("-__v").sort({ base_fee: 1 });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get shipping methods", error: error.message });
  }
};

const getShippingMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid shipping method id" });
    const data = await ShippingMethod.findById(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Shipping method not found" });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get shipping method", error: error.message });
  }
};

const updateShippingMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid shipping method id" });
    const updateData = {};
    for (const field of ["name", "base_fee", "estimate_days", "status"]) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    if (req.body.estimated_days !== undefined) updateData.estimate_days = req.body.estimated_days;
    const data = await ShippingMethod.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Shipping method not found" });
    return res.status(200).json({ success: true, message: "Update shipping method successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update shipping method", error: error.message });
  }
};

const deleteShippingMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid shipping method id" });
    const data = await ShippingMethod.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Shipping method not found" });
    return res.status(200).json({ success: true, message: "Delete shipping method successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete shipping method", error: error.message });
  }
};

module.exports = { createShippingMethod, getAllShippingMethods, getShippingMethodById, updateShippingMethodById, deleteShippingMethodById };