const mongoose = require("mongoose");
const ChatConversation = require("../models/ChatConversation.model");
const ChatMessage = require("../models/ChatMessage.model");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");

// Tao hoac lay cuoc tro chuyen open cho Customer
const createConversation = async (customerId) => {
  const customer = await User.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // 1. Kiem tra xem customer hien tai da co conversation dang 'open' nao chua
  // Neu co, tra ve luon de dam bao gioi han 1 conversation open tai 1 thoi diem
  const existing = await ChatConversation.findOne({
    customer_id: customerId,
    status: "open",
  });

  if (existing) {
    return existing;
  }

  // 2. Tim vai tro Staff de tu dong assign
  const staffRole = await Role.findOne({ code: "STAFF" });
  if (!staffRole) {
    throw new Error("Staff role not found in database");
  }

  const staffs = await User.find({ role_id: staffRole._id });
  if (staffs.length === 0) {
    throw new Error("No staff available to assign");
  }

  // 3. Tinh so cuoc tro chuyen dang open cua tung staff de phan bo cho nguoi it viec nhat (auto-assign)
  const conversationStats = await ChatConversation.aggregate([
    { $match: { status: "open" } },
    { $group: { _id: "$staff_id", count: { $sum: 1 } } },
  ]);

  const statsMap = {};
  conversationStats.forEach((stat) => {
    statsMap[String(stat._id)] = stat.count;
  });

  // Tim staff co so cuoc tro chuyen open thap nhat
  let assignedStaff = staffs[0];
  let minCount = statsMap[String(assignedStaff._id)] || 0;

  for (let i = 1; i < staffs.length; i++) {
    const s = staffs[i];
    const count = statsMap[String(s._id)] || 0;
    if (count < minCount) {
      minCount = count;
      assignedStaff = s;
    }
  }

  // 4. Tao conversation moi
  const conversation = await ChatConversation.create({
    customer_id: customerId,
    staff_id: assignedStaff._id,
    status: "open",
  });

  return conversation;
};

// Lay danh sach conversations tuy theo role
const getConversations = async (userId, role) => {
  const filter = {};
  if (String(role).toUpperCase() === "CUSTOMER") {
    filter.customer_id = userId;
  } else {
    // Mac dinh neu la Staff/Manager thi hien thi cuoc hoi thoai duoc chi dinh cho ho
    filter.staff_id = userId;
  }

  return await ChatConversation.find(filter)
    .populate("customer_id", "name email img_url")
    .populate("staff_id", "name email img_url")
    .sort({ updated_at: -1 })
    .lean();
};

// Lay lich su tin nhan kem phan trang
const getMessages = async (conversationId, { page = 1, limit = 50 }) => {
  const pageNum = Math.max(Number(page || 1), 1);
  const limitNum = Math.max(Number(limit || 50), 1);
  const skip = (pageNum - 1) * limitNum;

  const conversation = await ChatConversation.findById(conversationId)
    .populate("customer_id", "name email img_url")
    .populate("staff_id", "name email img_url")
    .lean();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const [messages, totalCount] = await Promise.all([
    ChatMessage.find({ conversation_id: conversationId })
      .populate("sender_id", "name email img_url")
      .select("-__v")
      .sort({ created_at: -1 }) // Lay tu tin moi nhat ve truoc
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ChatMessage.countDocuments({ conversation_id: conversationId }),
  ]);

  // Dao nguoc lai tin nhan de render theo thu tu thoi gian tang dan tren UI
  return {
    conversation,
    messages: messages.reverse(),
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalCount / limitNum),
    },
  };
};

// Luu message gui tu Socket hoac REST
const saveMessage = async ({ conversationId, senderId, message }) => {
  const conversation = await ChatConversation.findById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Luu message vao db
  const chatMsg = await ChatMessage.create({
    conversation_id: conversationId,
    sender_id: senderId,
    message: message.trim(),
  });

  // Cap nhat updated_at de sap xep cuoc hoi thoai noi len dau danh sach
  conversation.updated_at = new Date();
  await conversation.save();

  // Populate sender info truoc khi tra ve
  const populated = await ChatMessage.findById(chatMsg._id)
    .populate("sender_id", "name email img_url")
    .select("-__v")
    .lean();

  return populated;
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  saveMessage,
};
