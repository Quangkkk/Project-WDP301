const mongoose = require("mongoose");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");
const Order = require("../models/Orders.model");

// Manager lay danh sach toan bo nhan vien ho tro (Staff)
const getStaffList = async () => {
  const staffRole = await Role.findOne({ code: { $regex: /^staff$/i } });
  if (!staffRole) {
    throw new Error("Staff role not found in database");
  }

  return await User.find({ role_id: staffRole._id })
    .select("-hash_pass")
    .populate("role_id", "name code")
    .lean();
};

// Manager xem hieu suat cua Staff dua tren don hang hoan thanh
const getStaffPerformance = async (staffId) => {
  const staff = await User.findById(staffId);
  if (!staff) {
    throw new Error("Staff not found");
  }

  // Lay tat ca cac don hang hoan thanh duoc handle boi staff nay
  const completedOrders = await Order.find({
    handled_by: staffId,
    status: "completed",
  }).lean();

  const totalHandled = completedOrders.length;
  let averageMs = 0;
  let humanReadable = "0h 0m";

  if (totalHandled > 0) {
    let totalMs = 0;
    completedOrders.forEach((order) => {
      const created = new Date(order.created_at).getTime();
      const completed = new Date(order.updated_at).getTime();
      const diff = completed - created;
      if (diff > 0) {
        totalMs += diff;
      }
    });

    averageMs = Math.round(totalMs / totalHandled);
    const hours = Math.floor(averageMs / (1000 * 60 * 60));
    const minutes = Math.floor((averageMs % (1000 * 60 * 60)) / (1000 * 60));
    humanReadable = `${hours}h ${minutes}m`;
  }

  // Luu y ky thuat: UC 44 (Assign Tasks) nam ngoai pham vi 21 collection hien co.
  // Can them collection 'tasks' neu muon trien khai day du. Chi thuc hien phan kha thi voi schema hien tai.
  return {
    staff: {
      id: staff._id,
      name: staff.name,
      email: staff.email,
    },
    performance: {
      total_handled_orders: totalHandled,
      average_handling_time_ms: averageMs,
      average_handling_time_text: humanReadable,
    },
  };
};

module.exports = {
  getStaffList,
  getStaffPerformance,
};
