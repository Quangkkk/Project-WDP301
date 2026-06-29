const mongoose = require("mongoose");
const Permission = require("../models/Permission.model");
const RolePermission = require("../models/RolePermission.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createPermission = async (req, res) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: "code and name are required" });
    const data = await Permission.create({ code, name, description });
    return res.status(201).json({ success: true, message: "Create permission successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create permission", error: error.message });
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const data = await Permission.find().select("-__v").sort({ created_at: -1 });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get permissions", error: error.message });
  }
};

const updatePermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid permission id" });
    const updateData = {};
    for (const field of ["code", "name", "description"]) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    const data = await Permission.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Permission not found" });
    return res.status(200).json({ success: true, message: "Update permission successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update permission", error: error.message });
  }
};

const deletePermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid permission id" });
    await RolePermission.deleteMany({ permission_id: id });
    const data = await Permission.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Permission not found" });
    return res.status(200).json({ success: true, message: "Delete permission successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete permission", error: error.message });
  }
};

module.exports = { createPermission, getAllPermissions, updatePermissionById, deletePermissionById };