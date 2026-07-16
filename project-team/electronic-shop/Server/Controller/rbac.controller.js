const mongoose = require("mongoose");
const rbacService = require("../services/rbac.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// -------------------------------------------------------------
// ROLE CONTROLLERS
// -------------------------------------------------------------

const getRoles = async (req, res) => {
  try {
    const data = await rbacService.getRoles();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const { code, name, description } = req.body;
    const data = await rbacService.createRole({ code, name, description });
    return res.status(201).json({ success: true, message: "Create role successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid role ID" });

    const data = await rbacService.updateRole(id, { name, description });
    return res.status(200).json({ success: true, message: "Update role successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid role ID" });

    const data = await rbacService.deleteRole(id);
    return res.status(200).json({ success: true, message: "Delete role successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// PERMISSION CONTROLLERS
// -------------------------------------------------------------

const getPermissions = async (req, res) => {
  try {
    const data = await rbacService.getPermissions();
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createPermission = async (req, res) => {
  try {
    const { code, name, description } = req.body;
    const data = await rbacService.createPermission({ code, name, description });
    return res.status(201).json({ success: true, message: "Create permission successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid permission ID" });

    const data = await rbacService.updatePermission(id, { name, description });
    return res.status(200).json({ success: true, message: "Update permission successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid permission ID" });

    const data = await rbacService.deletePermission(id);
    return res.status(200).json({ success: true, message: "Delete permission successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// ROLE_PERMISSION MAPPING CONTROLLERS
// -------------------------------------------------------------

const assignPermissionToRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permission_id } = req.body;

    if (!isValidObjectId(roleId) || !isValidObjectId(permission_id)) {
      return res.status(400).json({ success: false, message: "Invalid roleId or permission_id" });
    }

    const data = await rbacService.assignPermissionToRole(roleId, permission_id);
    return res.status(201).json({ success: true, message: "Assign permission successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const removePermissionFromRole = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    if (!isValidObjectId(roleId) || !isValidObjectId(permissionId)) {
      return res.status(400).json({ success: false, message: "Invalid roleId or permissionId" });
    }

    const data = await rbacService.removePermissionFromRole(roleId, permissionId);
    return res.status(200).json({ success: true, message: "Remove permission successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    if (!isValidObjectId(roleId)) return res.status(400).json({ success: false, message: "Invalid role ID" });

    const data = await rbacService.getRolePermissions(roleId);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// USER ACTIONS
// -------------------------------------------------------------

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid user ID" });
    if (!status) return res.status(400).json({ success: false, message: "status is required" });

    const data = await rbacService.updateUserStatus(id, status);
    return res.status(200).json({ success: true, message: "Update user status successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;

    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid user ID" });
    if (!role_id || !isValidObjectId(role_id)) return res.status(400).json({ success: false, message: "Valid role_id is required" });

    const data = await rbacService.updateUserRole(id, role_id);
    return res.status(200).json({ success: true, message: "Update user role successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
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
