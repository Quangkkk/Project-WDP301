const ChatConversation = require("../models/ChatConversation.model");
const ChatMessage = require("../models/ChatMessage.model");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");

const normalizeRole = (role) => String(role || "").toUpperCase();

const populateConversation = (query) =>
  query
    .populate("customer_id", "name email phone img_url")
    .populate("staff_id", "name email phone img_url")
    .select("-__v");

const populateMessage = (query) =>
  query.populate("sender_id", "name email img_url role_id").select("-__v");

const createConversation = async (customerId) => {
  const customer = await User.findById(customerId);
  if (!customer) throw new Error("Customer not found");

  const existing = await ChatConversation.findOne({
    customer_id: customerId,
  }).sort({ updated_at: -1, created_at: -1 });

  if (existing) {
    if (existing.status === "closed") {
      existing.status = "open";
      await existing.save();
    }
    return populateConversation(ChatConversation.findById(existing._id)).lean();
  }

  const staffRole = await Role.findOne({ code: { $regex: /^staff$/i } });
  if (!staffRole) throw new Error("Staff role not found in database");

  const staffs = await User.find({
    role_id: staffRole._id,
    status: { $ne: "blocked" },
  });

  if (staffs.length === 0) throw new Error("No staff available to assign");

  const conversationStats = await ChatConversation.aggregate([
    { $match: { status: "open" } },
    { $group: { _id: "$staff_id", count: { $sum: 1 } } },
  ]);

  const statsMap = Object.fromEntries(
    conversationStats.map((item) => [String(item._id), item.count])
  );

  const assignedStaff = staffs.reduce((selected, current) => {
    const selectedCount = statsMap[String(selected._id)] || 0;
    const currentCount = statsMap[String(current._id)] || 0;
    return currentCount < selectedCount ? current : selected;
  }, staffs[0]);

  const conversation = await ChatConversation.create({
    customer_id: customerId,
    staff_id: assignedStaff._id,
    status: "open",
  });

  // Auto-reply welcome message
  await ChatMessage.create({
    conversation_id: conversation._id,
    sender_id: assignedStaff._id,
    message: "Xin chào! Cảm ơn bạn đã liên hệ với bộ phận hỗ trợ. Tôi có thể giúp gì cho bạn hôm nay?",
    attachments: [],
    is_read: false,
  });

  return populateConversation(ChatConversation.findById(conversation._id)).lean();
};

const getConversations = async (userId, role, filters = {}) => {
  const normalizedRole = normalizeRole(role);
  const query = {};

  if (normalizedRole === "CUSTOMER") {
    query.customer_id = userId;
  } else if (normalizedRole === "STAFF") {
    query.staff_id = userId;
  } else if (!["ADMIN", "MANAGER"].includes(normalizedRole)) {
    throw new Error("Unauthorized conversation access");
  }

  if (filters.status && filters.status !== "all") query.status = filters.status;
  if (
    filters.customer_id &&
    ["STAFF", "ADMIN", "MANAGER"].includes(normalizedRole)
  ) {
    query.customer_id = filters.customer_id;
  }
  if (filters.staff_id && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
    query.staff_id = filters.staff_id;
  }

  const conversations = await populateConversation(ChatConversation.find(query))
    .sort({ updated_at: -1, created_at: -1 })
    .lean();

  // Lọc lấy conversation mới nhất cho mỗi customer (1 account = 1 chat)
  const uniqueConversations = [];
  const customerSet = new Set();

  for (const conv of conversations) {
    const custId = conv.customer_id?._id
      ? String(conv.customer_id._id)
      : String(conv.customer_id);

    if (custId && !customerSet.has(custId)) {
      customerSet.add(custId);
      uniqueConversations.push(conv);
    }
  }

  return uniqueConversations;
};

const assertConversationAccess = async (conversationId, userId, role) => {
  const conversation = await ChatConversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const normalizedRole = normalizeRole(role);
  const isCustomer = String(conversation.customer_id) === String(userId);
  const isAssignedStaff = String(conversation.staff_id) === String(userId);
  const isPrivileged = ["ADMIN", "MANAGER"].includes(normalizedRole);

  if (
    (normalizedRole === "CUSTOMER" && !isCustomer) ||
    (normalizedRole === "STAFF" && !isAssignedStaff) ||
    (!["CUSTOMER", "STAFF", "ADMIN", "MANAGER"].includes(normalizedRole))
  ) {
    throw new Error("Unauthorized conversation access");
  }

  if (!isCustomer && !isAssignedStaff && !isPrivileged) {
    throw new Error("Unauthorized conversation access");
  }

  return conversation;
};

const getMessages = async (
  conversationId,
  { page = 1, limit = 100, userId, role } = {}
) => {
  if (userId && role) {
    await assertConversationAccess(conversationId, userId, role);
  }

  const pageNum = Math.max(Number(page || 1), 1);
  const limitNum = Math.min(Math.max(Number(limit || 100), 1), 200);
  const skip = (pageNum - 1) * limitNum;

  const conversation = await populateConversation(
    ChatConversation.findById(conversationId)
  ).lean();

  if (!conversation) throw new Error("Conversation not found");

  const [messages, totalCount] = await Promise.all([
    populateMessage(
      ChatMessage.find({ conversation_id: conversationId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
    ).lean(),
    ChatMessage.countDocuments({ conversation_id: conversationId }),
  ]);

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

const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((item) => ({
      original_name: item.original_name || item.originalName || item.name || "",
      filename: item.filename || "",
      mime_type: item.mime_type || item.mimeType || "",
      size: Number(item.size || 0),
      url: item.url || "",
      type:
        item.type === "image" ||
        String(item.mime_type || item.mimeType || "").startsWith("image/")
          ? "image"
          : "file",
    }))
    .filter((item) => item.url);
};

const saveMessage = async ({
  conversationId,
  senderId,
  role,
  message,
  attachments = [],
}) => {
  const conversation = await assertConversationAccess(
    conversationId,
    senderId,
    role
  );

  if (conversation.status === "closed") {
    throw new Error("Conversation is closed");
  }

  const cleanMessage = String(message || "").trim();
  const cleanAttachments = normalizeAttachments(attachments);

  if (!cleanMessage && cleanAttachments.length === 0) {
    throw new Error("Message content cannot be empty");
  }

  const created = await ChatMessage.create({
    conversation_id: conversationId,
    sender_id: senderId,
    message: cleanMessage,
    attachments: cleanAttachments,
    is_read: false,
  });

  conversation.updated_at = new Date();
  await conversation.save();

  return populateMessage(ChatMessage.findById(created._id)).lean();
};

const markMessagesAsRead = async (conversationId, userId, role) => {
  await assertConversationAccess(conversationId, userId, role);

  await ChatMessage.updateMany(
    {
      conversation_id: conversationId,
      sender_id: { $ne: userId },
      is_read: false,
    },
    {
      is_read: true,
      read_at: new Date(),
    }
  );
};

const updateConversation = async (conversationId, payload = {}) => {
  const updateData = {};

  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.staff_id !== undefined) updateData.staff_id = payload.staff_id || null;
  if (payload.assigned_staff_id !== undefined) {
    updateData.staff_id = payload.assigned_staff_id || null;
  }

  const data = await populateConversation(
    ChatConversation.findByIdAndUpdate(conversationId, updateData, {
      new: true,
      runValidators: true,
    })
  ).lean();

  if (!data) throw new Error("Conversation not found");
  return data;
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  saveMessage,
  markMessagesAsRead,
  updateConversation,
  assertConversationAccess,
};
