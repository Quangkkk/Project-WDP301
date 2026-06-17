const mongoose = require("mongoose");
const Role = require("../models/Roles.model");
const Permission = require("../models/Permission.model");
const RolePermission = require("../models/RolePermission.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createRole = async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: "code and name are required" });
    const data = await Role.create({ code, name });
    return res.status(201).json({ success: true, message: "Create role successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create role", error: error.message });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().select("-__v").sort({ createdAt: -1 }).lean();
    const roleIds = roles.map((role) => role._id);
    const rolePermissions = await RolePermission.find({ role_id: { $in: roleIds } }).populate("permission_id", "code name description").lean();
    const permissionsByRole = rolePermissions.reduce((map, item) => {
      const key = String(item.role_id);
      if (!map[key]) map[key] = [];
      map[key].push(item.permission_id);
      return map;
    }, {});
    const data = roles.map((role) => ({ ...role, permissions: permissionsByRole[String(role._id)] || [] }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get roles", error: error.message });
  }
};

const updateRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid role id" });
    const updateData = {};
    if (req.body.code !== undefined) updateData.code = req.body.code;
    if (req.body.name !== undefined) updateData.name = req.body.name;
    const data = await Role.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Role not found" });
    return res.status(200).json({ success: true, message: "Update role successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update role", error: error.message });
  }
};

const deleteRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid role id" });
    await RolePermission.deleteMany({ role_id: id });
    const data = await Role.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Role not found" });
    return res.status(200).json({ success: true, message: "Delete role successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete role", error: error.message });
  }
};

const assignPermission = async (req, res) => {
  try {
    const role_id = req.params.roleId;
    const { permission_id } = req.body;
    if (!isValidObjectId(role_id) || !isValidObjectId(permission_id)) return res.status(400).json({ success: false, message: "Invalid role_id or permission_id" });
    const [role, permission] = await Promise.all([Role.findById(role_id), Permission.findById(permission_id)]);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });
    if (!permission) return res.status(404).json({ success: false, message: "Permission not found" });
    const data = await RolePermission.findOneAndUpdate({ role_id, permission_id }, { role_id, permission_id }, { new: true, upsert: true, runValidators: true });
    return res.status(200).json({ success: true, message: "Assign permission successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to assign permission", error: error.message });
  }
};

const removePermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    const data = await RolePermission.findOneAndDelete({ role_id: roleId, permission_id: permissionId });
    if (!data) return res.status(404).json({ success: false, message: "Role permission not found" });
    return res.status(200).json({ success: true, message: "Remove permission successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to remove permission", error: error.message });
  }
};

module.exports = { createRole, getAllRoles, updateRoleById, deleteRoleById, assignPermission, removePermission };