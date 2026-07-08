const mongoose = require("mongoose");
const Role = require("../models/Roles.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createRole = async (req, res) => {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "code and name are required",
      });
    }

    const data = await Role.create({
      code: code.toLowerCase().trim(),
      name,
      description: description || null,
    });

    return res.status(201).json({
      success: true,
      message: "Create role successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create role",
      error: error.message,
    });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const data = await Role.find()
      .select("-__v")
      .sort({ created_at: -1 });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get roles",
      error: error.message,
    });
  }
};

const updateRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role id",
      });
    }

    const updateData = {};

    for (const field of ["code", "name", "description"]) {
      if (req.body[field] !== undefined) {
        updateData[field] =
          field === "code"
            ? req.body[field].toLowerCase().trim()
            : req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    const data = await Role.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update role successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update role",
      error: error.message,
    });
  }
};

const deleteRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role id",
      });
    }

    const data = await Role.findByIdAndDelete(id).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delete role successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete role",
      error: error.message,
    });
  }
};

module.exports = {
  createRole,
  getAllRoles,
  updateRoleById,
  deleteRoleById,
};