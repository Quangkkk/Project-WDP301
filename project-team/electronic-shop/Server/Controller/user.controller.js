const mongoose = require("mongoose");
const userService = require("../services/user.service");

// Helper check ObjectId hop le
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller them user moi (Admin/Manager)
const addUser = async (req, res) => {
  try {
    const { role_id, name, email, password, hash_pass, phone, img_url, status } = req.body;

    if (!role_id || !name || !email || (!password && !hash_pass)) {
      return res.status(400).json({
        success: false,
        message: "role_id, name, email and password/hash_pass are required",
      });
    }

    if (!isValidObjectId(role_id)) {
      return res.status(400).json({ success: false, message: "Invalid role_id" });
    }

    const data = await userService.addUser({
      role_id,
      name,
      email,
      password,
      hash_pass,
      phone,
      img_url,
      status,
    });

    return res.status(201).json({ success: true, message: "Create user successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Role not found") {
      statusCode = 404;
    } else if (error.message === "Email already exists") {
      statusCode = 409;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create user",
      error: error.message,
    });
  }
};

// Controller lay danh sach user (Admin/Manager)
const getAllUser = async (req, res) => {
  try {
    const { role_id, status, q } = req.query;
    const data = await userService.getAllUsers({ role_id, status, q });
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get users",
      error: error.message,
    });
  }
};

// Controller lay thong tin user theo ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const { user, addresses } = await userService.getUserById(id);
    return res.status(200).json({ success: true, data: { user, addresses } });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get user",
      error: error.message,
    });
  }
};

// Controller cap nhat thong tin user theo ID (Admin/Manager)
const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const data = await userService.updateUserById(id, req.body);
    return res.status(200).json({ success: true, message: "Update user successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found" || error.message === "Role not found") {
      statusCode = 404;
    } else if (error.message === "Email already exists") {
      statusCode = 409;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update user",
      error: error.message,
    });
  }
};

// Controller xoa user theo ID (Admin/Manager)
const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const data = await userService.deleteUserById(id);
    return res.status(200).json({ success: true, message: "Delete user successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete user",
      error: error.message,
    });
  }
};

// Controller lay profile cua user hien tai
const getProfile = async (req, res) => {
  try {
    const userId = req.user_id; // Duoc gan tu middleware verifyToken
    const { user, addresses } = await userService.getProfile(userId);
    return res.status(200).json({ success: true, data: { user, addresses } });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get profile",
      error: error.message,
    });
  }
};

// Controller cap nhat profile cua user hien tai
const updateProfile = async (req, res) => {
  try {
    const userId = req.user_id; // Duoc gan tu middleware verifyToken
    const { name, phone, img_url, password } = req.body;

    const data = await userService.updateProfile(userId, { name, phone, img_url, password });
    return res.status(200).json({ success: true, message: "Update profile successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update profile",
      error: error.message,
    });
  }
};

// Controller them dia chi moi cho user
const createAddress = async (req, res) => {
  try {
    const user_id = req.params.userId || req.body.user_id;
    const receive_name = req.body.receive_name || req.body.receiver_name;
    const receive_phone = req.body.receive_phone || req.body.receiver_phone;
    const { province, district, ward, address_line, is_default } = req.body;

    if (!isValidObjectId(user_id)) {
      return res.status(400).json({ success: false, message: "Invalid user_id" });
    }

    const data = await userService.createAddress(user_id, {
      receive_name,
      receive_phone,
      province,
      district,
      ward,
      address_line,
      is_default,
    });

    return res.status(201).json({ success: true, message: "Create address successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    } else if (error.message.includes("required") || error.message.includes("Missing")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create address",
      error: error.message,
    });
  }
};

// Controller cap nhat dia chi
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!isValidObjectId(addressId)) {
      return res.status(400).json({ success: false, message: "Invalid address id" });
    }

    const receive_name = req.body.receive_name || req.body.receiver_name;
    const receive_phone = req.body.receive_phone || req.body.receiver_phone;
    const { province, district, ward, address_line, is_default } = req.body;

    const data = await userService.updateAddress(addressId, {
      receive_name,
      receive_phone,
      province,
      district,
      ward,
      address_line,
      is_default,
    });

    return res.status(200).json({ success: true, message: "Update address successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Address not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update address",
      error: error.message,
    });
  }
};

// Controller xoa dia chi
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!isValidObjectId(addressId)) {
      return res.status(400).json({ success: false, message: "Invalid address id" });
    }

    const data = await userService.deleteAddress(addressId);
    return res.status(200).json({ success: true, message: "Delete address successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Address not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete address",
      error: error.message,
    });
  }
};

module.exports = {
  addUser,
  getAllUser,
  getUserById,
  updateUserById,
  deleteUserById,
  getProfile,
  updateProfile,
  createAddress,
  updateAddress,
  deleteAddress,
};
