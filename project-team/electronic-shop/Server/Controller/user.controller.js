const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User.model");
const Role = require("../models/Roles.model");
const UserAddress = require("../models/UserAddress.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const safeSelect = "-hash_pass -__v";

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

    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const existedUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existedUser) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : hash_pass;

    const user = await User.create({
      role_id,
      name,
      email: email.toLowerCase().trim(),
      hash_pass: hashedPassword,
      phone: phone || null,
      img_url: img_url || null,
      status: status || "active",
    });

    const data = await User.findById(user._id).select(safeSelect).populate("role_id", "name code");
    return res.status(201).json({ success: true, message: "Create user successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create user", error: error.message });
  }
};

const getAllUser = async (req, res) => {
  try {
    const { role_id, status, q } = req.query;
    const filter = {};

    if (role_id) filter.role_id = role_id;
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
      ];
    }

    const data = await User.find(filter)
      .select(safeSelect)
      .populate("role_id", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get users", error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await User.findById(id).select(safeSelect).populate("role_id", "name code");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const addresses = await UserAddress.find({ user_id: id })
      .select("-__v")
      .sort({ is_default: -1, createdAt: -1 });

    return res.status(200).json({ success: true, data: { user, addresses } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get user", error: error.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const allowedFields = ["role_id", "name", "email", "phone", "img_url", "status"];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
      const existedUser = await User.findOne({ email: updateData.email, _id: { $ne: id } });
      if (existedUser) {
        return res.status(409).json({ success: false, message: "Email already exists" });
      }
    }

    if (updateData.role_id) {
      if (!isValidObjectId(updateData.role_id)) {
        return res.status(400).json({ success: false, message: "Invalid role_id" });
      }

      const role = await Role.findById(updateData.role_id);
      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }
    }

    if (req.body.password) updateData.hash_pass = await bcrypt.hash(req.body.password, 10);
    if (req.body.hash_pass) updateData.hash_pass = req.body.hash_pass;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No data to update" });
    }

    const data = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .select(safeSelect)
      .populate("role_id", "name code");

    if (!data) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "Update user successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update user", error: error.message });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const data = await User.findByIdAndDelete(id).select(safeSelect);
    if (!data) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await UserAddress.deleteMany({ user_id: id });
    return res.status(200).json({ success: true, message: "Delete user successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete user", error: error.message });
  }
};

const createAddress = async (req, res) => {
  try {
    const user_id = req.params.userId || req.body.user_id;
    const { receiver_name, receiver_phone, province, district, ward, address_line, is_default } = req.body;

    if (!isValidObjectId(user_id)) {
      return res.status(400).json({ success: false, message: "Invalid user_id" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!receiver_name || !receiver_phone || !province || !district || !ward || !address_line) {
      return res.status(400).json({ success: false, message: "Missing address required fields" });
    }

    if (is_default) await UserAddress.updateMany({ user_id }, { is_default: false });

    const data = await UserAddress.create({
      user_id,
      receiver_name,
      receiver_phone,
      province,
      district,
      ward,
      address_line,
      is_default: Boolean(is_default),
    });

    return res.status(201).json({ success: true, message: "Create address successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create address", error: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!isValidObjectId(addressId)) {
      return res.status(400).json({ success: false, message: "Invalid address id" });
    }

    const address = await UserAddress.findById(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    if (req.body.is_default) {
      await UserAddress.updateMany({ user_id: address.user_id }, { is_default: false });
    }

    const allowedFields = ["receiver_name", "receiver_phone", "province", "district", "ward", "address_line", "is_default"];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const data = await UserAddress.findByIdAndUpdate(addressId, updateData, { new: true, runValidators: true });
    return res.status(200).json({ success: true, message: "Update address successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update address", error: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!isValidObjectId(addressId)) {
      return res.status(400).json({ success: false, message: "Invalid address id" });
    }

    const data = await UserAddress.findByIdAndDelete(addressId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    return res.status(200).json({ success: true, message: "Delete address successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete address", error: error.message });
  }
};

module.exports = {
  addUser,
  getAllUser,
  getUserById,
  updateUserById,
  deleteUserById,
  createAddress,
  updateAddress,
  deleteAddress,
};