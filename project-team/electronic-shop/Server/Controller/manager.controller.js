const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const managerService = require("../services/manager.service");
const userService = require("../services/user.service");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller lay danh sach staff
const getStaffList = async (req, res) => {
  try {
    const data = await managerService.getStaffList();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get staff list",
      error: error.message,
    });
  }
};

// Controller tao tai khoan nhan vien moi (role STAFF)
const createStaff = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email va password la bat buoc",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mat khau phai co it nhat 6 ky tu",
      });
    }

    // Tim role STAFF
    const staffRole = await Role.findOne({ code: { $regex: /^staff$/i } });
    if (!staffRole) {
      return res.status(500).json({ success: false, message: "Staff role not found in database" });
    }

    const data = await userService.addUser({
      role_id: staffRole._id,
      name,
      email,
      password,
      phone: phone || null,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Tao tai khoan nhan vien thanh cong",
      data,
    });
  } catch (error) {
    const statusCode = error.message === "Email already exists" ? 409 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create staff",
      error: error.message,
    });
  }
};

// Controller khoa / mo khoa tai khoan nhan vien
const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "active" hoac "blocked"

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff ID" });
    }

    const allowed = ["active", "blocked"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trang thai khong hop le. Chi chap nhan: active, blocked",
      });
    }

    // Kiem tra la staff
    const staffRole = await Role.findOne({ code: { $regex: /^staff$/i } });
    const user = await User.findOne({ _id: id, role_id: staffRole?._id });
    if (!user) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: status === "blocked" ? "Da khoa tai khoan nhan vien" : "Da mo khoa tai khoan nhan vien",
      data: { _id: user._id, status: user.status },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update staff status",
      error: error.message,
    });
  }
};

// Controller lay hieu suat cua staff
const getStaffPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Valid staff ID is required" });
    }

    const data = await managerService.getStaffPerformance(id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Staff not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get staff performance",
      error: error.message,
    });
  }
};

module.exports = {
  getStaffList,
  createStaff,
  toggleStaffStatus,
  getStaffPerformance,
};
