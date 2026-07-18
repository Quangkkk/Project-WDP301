const mongoose = require("mongoose");
const Role = require("../models/Roles.model");
const Permission = require("../models/Permission.model");
const RolePermission = require("../models/RolePermission.model");
const User = require("../models/User.model");

// Cache Map luu tru quyen cua tung role de tranh query database moi request
// Key: role_id (string), Value: Set of permission codes (strings)
const permissionCache = new Map();

const clearPermissionCache = (roleId = null) => {
  if (roleId) {
    permissionCache.delete(String(roleId));
  } else {
    permissionCache.clear();
  }
};

// -------------------------------------------------------------
// ROLE SERVICES
// -------------------------------------------------------------

const getRoles = async () => {
  return await Role.find().sort({ created_at: -1 }).lean();
};

const createRole = async ({ code, name, description }) => {
  if (!code || !name) {
    throw new Error("code and name are required for Role");
  }
  const existed = await Role.findOne({ code: code.toUpperCase() });
  if (existed) {
    throw new Error("Role code already exists");
  }
  return await Role.create({
    code: code.toUpperCase(),
    name,
    description,
  });
};

const updateRole = async (id, { name, description }) => {
  const role = await Role.findByIdAndUpdate(id, { name, description }, { new: true, runValidators: true });
  if (!role) {
    throw new Error("Role not found");
  }
  return role;
};

const deleteRole = async (id) => {
  const role = await Role.findByIdAndDelete(id);
  if (!role) {
    throw new Error("Role not found");
  }
  // Xoa lien ket va xoa cache
  await RolePermission.deleteMany({ role_id: id });
  clearPermissionCache(id);
  return role;
};

// -------------------------------------------------------------
// PERMISSION SERVICES
// -------------------------------------------------------------

const getPermissions = async () => {
  return await Permission.find().sort({ created_at: -1 }).lean();
};

const createPermission = async ({ code, name, description }) => {
  if (!code || !name) {
    throw new Error("code and name are required for Permission");
  }
  const existed = await Permission.findOne({ code: code.toUpperCase() });
  if (existed) {
    throw new Error("Permission code already exists");
  }
  return await Permission.create({
    code: code.toUpperCase(),
    name,
    description,
  });
};

const updatePermission = async (id, { name, description }) => {
  const perm = await Permission.findByIdAndUpdate(id, { name, description }, { new: true, runValidators: true });
  if (!perm) {
    throw new Error("Permission not found");
  }
  return perm;
};

const deletePermission = async (id) => {
  const perm = await Permission.findByIdAndDelete(id);
  if (!perm) {
    throw new Error("Permission not found");
  }
  // Xoa tat ca lien ket cua permission nay den cac role
  await RolePermission.deleteMany({ permission_id: id });
  clearPermissionCache(); // Xoa toan bo cache do code bi xoa
  return perm;
};

// -------------------------------------------------------------
// ROLE_PERMISSION MAPPING SERVICES
// -------------------------------------------------------------

const assignPermissionToRole = async (roleId, permissionId) => {
  const role = await Role.findById(roleId);
  if (!role) throw new Error("Role not found");

  const perm = await Permission.findById(permissionId);
  if (!perm) throw new Error("Permission not found");

  const existed = await RolePermission.findOne({ role_id: roleId, permission_id: permissionId });
  if (existed) {
    return existed;
  }

  const rolePerm = await RolePermission.create({
    role_id: roleId,
    permission_id: permissionId,
  });

  // Clear cache cho role nay de cap nhat lai quyen moi nhat
  clearPermissionCache(roleId);

  return rolePerm;
};

const removePermissionFromRole = async (roleId, permissionId) => {
  const rolePerm = await RolePermission.findOneAndDelete({ role_id: roleId, permission_id: permissionId });
  if (!rolePerm) {
    throw new Error("Mapping not found");
  }

  // Clear cache cho role nay
  clearPermissionCache(roleId);

  return rolePerm;
};

const getRolePermissions = async (roleId) => {
  const mappings = await RolePermission.find({ role_id: roleId })
    .populate("permission_id", "code name description")
    .lean();

  return mappings.map((m) => m.permission_id).filter(Boolean);
};

// -------------------------------------------------------------
// USER ADMIN ACTIONS (Active/Deactive & Change Role)
// -------------------------------------------------------------

const updateUserStatus = async (userId, status) => {
  if (!["active", "inactive", "unverified"].includes(status)) {
    throw new Error("Invalid status. Allowed: active, inactive, unverified");
  }

  const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select("-hash_pass");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

const updateUserRole = async (userId, roleId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error("Role not found");
  }

  const user = await User.findByIdAndUpdate(userId, { role_id: roleId }, { new: true }).select("-hash_pass");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

module.exports = {
  permissionCache,
  clearPermissionCache,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  assignPermissionToRole,
  removePermissionFromRole,
  getRolePermissions,
  updateUserStatus,
  updateUserRole,
};
