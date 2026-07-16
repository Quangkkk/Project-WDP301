const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");
const UserAddress = require("../models/UserAddress.model");

const safeSelect = "-hash_pass -__v";

// Them nguoi dung moi (danh cho Admin/Manager)
const addUser = async ({ role_id, name, email, password, hash_pass, phone, img_url, status }) => {
  const role = await Role.findById(role_id);
  if (!role) {
    throw new Error("Role not found");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existedUser = await User.findOne({ email: normalizedEmail });
  if (existedUser) {
    throw new Error("Email already exists");
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : hash_pass;

  const user = await User.create({
    role_id,
    name,
    email: normalizedEmail,
    phone: phone || null,
    img_url: img_url || null,
    hash_pass: hashedPassword,
    status: status || "active",
  });

  return await User.findById(user._id)
    .select(safeSelect)
    .populate("role_id", "name code description");
};

// Lay danh sach tat ca nguoi dung (danh cho Admin/Manager)
const getAllUsers = async ({ role_id, status, q }) => {
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

  return await User.find(filter)
    .select(safeSelect)
    .populate("role_id", "name code description")
    .sort({ created_at: -1 });
};

// Lay nguoi dung theo ID
const getUserById = async (id) => {
  const user = await User.findById(id)
    .select(safeSelect)
    .populate("role_id", "name code description");
  if (!user) {
    throw new Error("User not found");
  }

  const addresses = await UserAddress.find({ user_id: id })
    .select("-__v")
    .sort({ is_default: -1, created_at: -1 });

  return { user, addresses };
};

// Cap nhat thong tin nguoi dung theo ID (danh cho Admin/Manager)
const updateUserById = async (id, updateFields) => {
  const { role_id, name, email, phone, img_url, status, password, hash_pass } = updateFields;
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (img_url !== undefined) updateData.img_url = img_url;
  if (status !== undefined) updateData.status = status;

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    const existedUser = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
    if (existedUser) {
      throw new Error("Email already exists");
    }
    updateData.email = normalizedEmail;
  }

  if (role_id) {
    const role = await Role.findById(role_id);
    if (!role) {
      throw new Error("Role not found");
    }
    updateData.role_id = role_id;
  }

  if (password) {
    updateData.hash_pass = await bcrypt.hash(password, 10);
  } else if (hash_pass) {
    updateData.hash_pass = hash_pass;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    .select(safeSelect)
    .populate("role_id", "name code description");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Xoa nguoi dung va tat ca dia chi cua ho
const deleteUserById = async (id) => {
  const user = await User.findByIdAndDelete(id).select(safeSelect);
  if (!user) {
    throw new Error("User not found");
  }

  await UserAddress.deleteMany({ user_id: id });
  return user;
};

// --- Profile & Address logic cho Customer ---

// Lay profile cua user hien tai
const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .select(safeSelect)
    .populate("role_id", "name code description");
  if (!user) {
    throw new Error("User not found");
  }

  const addresses = await UserAddress.find({ user_id: userId })
    .select("-__v")
    .sort({ is_default: -1, created_at: -1 });

  return { user, addresses };
};

// Cap nhat profile cua user hien tai
const updateProfile = async (userId, { name, phone, img_url, password }) => {
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (img_url !== undefined) updateData.img_url = img_url;

  if (password) {
    updateData.hash_pass = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true })
    .select(safeSelect)
    .populate("role_id", "name code description");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Them dia chi moi
const createAddress = async (userId, addressData) => {
  const { receive_name, receive_phone, province, district, ward, address_line, is_default } = addressData;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!receive_name || !receive_phone || !province || !district || !ward || !address_line) {
    throw new Error("Missing address required fields");
  }

  // Neu dat lam mac dinh thi reset tat ca dia chi khac ve false
  if (is_default) {
    await UserAddress.updateMany({ user_id: userId }, { is_default: false });
  }

  return await UserAddress.create({
    user_id: userId,
    receive_name,
    receive_phone,
    province,
    district,
    ward,
    address_line,
    is_default: Boolean(is_default),
  });
};

// Cap nhat dia chi
const updateAddress = async (addressId, addressData) => {
  const address = await UserAddress.findById(addressId);
  if (!address) {
    throw new Error("Address not found");
  }

  const { receive_name, receive_phone, province, district, ward, address_line, is_default } = addressData;

  // Neu dat lam mac dinh thi reset tat ca dia chi khac cua user nay ve false
  if (is_default) {
    await UserAddress.updateMany({ user_id: address.user_id }, { is_default: false });
  }

  const updateData = {};
  if (receive_name !== undefined) updateData.receive_name = receive_name;
  if (receive_phone !== undefined) updateData.receive_phone = receive_phone;
  if (province !== undefined) updateData.province = province;
  if (district !== undefined) updateData.district = district;
  if (ward !== undefined) updateData.ward = ward;
  if (address_line !== undefined) updateData.address_line = address_line;
  if (is_default !== undefined) updateData.is_default = Boolean(is_default);

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  return await UserAddress.findByIdAndUpdate(addressId, updateData, { new: true, runValidators: true }).select("-__v");
};

// Xoa dia chi
const deleteAddress = async (addressId) => {
  const address = await UserAddress.findByIdAndDelete(addressId).select("-__v");
  if (!address) {
    throw new Error("Address not found");
  }
  return address;
};

module.exports = {
  addUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  getProfile,
  updateProfile,
  createAddress,
  updateAddress,
  deleteAddress,
};
