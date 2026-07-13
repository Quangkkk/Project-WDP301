const mongoose = require("mongoose");
const ShippingMethod = require("../models/ShippingMethod.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeActive = (body) => {
  if (body.is_active !== undefined) return body.is_active;
  if (body.status !== undefined) return body.status === "active" || body.status === true;
  return true;
};

const createShippingMethod = async (req, res) => {
  try {
    const { name, base_fee, estimate_days } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const data = await ShippingMethod.create({
      name,
      base_fee: base_fee ?? 0,
      estimate_days: estimate_days ?? 0,
      is_active: normalizeActive(req.body),
    });

    return res.status(201).json({ success: true, message: "Create shipping method successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create shipping method", error: error.message });
  }
};

const getAllShippingMethods = async (req, res) => {
  try {
    const filter = {};
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === "true" || req.query.is_active === true;
    if (req.query.status !== undefined) filter.is_active = req.query.status === "active" || req.query.status === "true";

    const data = await ShippingMethod.find(filter).select("-__v").sort({ created_at: -1 });
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
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.base_fee !== undefined) updateData.base_fee = req.body.base_fee;
    if (req.body.estimate_days !== undefined) updateData.estimate_days = req.body.estimate_days;
    if (req.body.is_active !== undefined || req.body.status !== undefined) updateData.is_active = normalizeActive(req.body);

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

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

module.exports = {
  createShippingMethod,
  getAllShippingMethods,
  getShippingMethodById,
  updateShippingMethodById,
  deleteShippingMethodById,
};
