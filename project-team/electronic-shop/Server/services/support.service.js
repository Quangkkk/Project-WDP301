const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket.model");
const TicketMessage = require("../models/TicketMessage.model");
const Order = require("../models/Orders.model");
const User = require("../models/User.model");
const ChatConversation = require("../models/ChatConversation.model");
const ChatMessage = require("../models/ChatMessage.model");

const normalizeRole = (role) => String(role || "").toUpperCase();

const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((item) => ({
      original_name: item.original_name || item.originalName || item.name || "",
      filename: item.filename || item.public_id || "",
      public_id: item.public_id || item.filename || "",
      resource_type: item.resource_type || "",
      format: item.format || "",
      provider: item.provider || "cloudinary",
      mime_type: item.mime_type || item.mimeType || "",
      size: Number(item.size || 0),
      url: item.url || item.secure_url || "",
      type:
        item.type === "image" ||
        String(item.mime_type || item.mimeType || "").startsWith("image/")
          ? "image"
          : "file",
    }))
    .filter((item) => item.url && /^https:\/\//i.test(item.url));
};

const getAssignedStaffId = (ticket) =>
  String(ticket?.assigned_staff_id?._id || ticket?.assigned_staff_id || "");

const getTicketId = (ticket) => String(ticket?._id || ticket || "");

const assertTicketAccess = (
  ticket,
  userId,
  role,
  { requireAssignedForStaff = false } = {}
) => {
  const roleUpper = normalizeRole(role);
  const currentUserId = String(userId || "");

  if (roleUpper === "CUSTOMER") {
    const ownerId = String(ticket?.user_id?._id || ticket?.user_id || "");

    if (ownerId !== currentUserId) {
      throw new Error("Unauthorized access to this ticket");
    }

    return;
  }

  if (roleUpper !== "STAFF") return;

  const assignedStaffId = getAssignedStaffId(ticket);

  if (assignedStaffId && assignedStaffId !== currentUserId) {
    throw new Error("This ticket belongs to another staff member");
  }

  if (requireAssignedForStaff && !assignedStaffId) {
    throw new Error("Please claim this ticket before handling it");
  }
};

const populateTicketQuery = (query) =>
  query
    .populate("user_id", "name email phone img_url avatar avatar_url")
    .populate(
      "assigned_staff_id",
      "name email phone img_url avatar avatar_url"
    )
    .populate("order_id", "total_amount status created_at");

const getTicketSummaryById = async (ticketId) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    return null;
  }

  return populateTicketQuery(SupportTicket.findById(ticketId)).lean();
};

const attachLegacyLastMessageDates = async (tickets = []) => {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];

  const missingIds = tickets
    .filter((ticket) => !ticket.last_message_at)
    .map((ticket) => ticket._id)
    .filter(Boolean);

  if (missingIds.length === 0) return tickets;

  const lastMessages = await TicketMessage.aggregate([
    {
      $match: {
        ticket_id: { $in: missingIds },
      },
    },
    {
      $group: {
        _id: "$ticket_id",
        last_message_at: { $max: "$created_at" },
      },
    },
  ]);

  const lastMessageMap = new Map(
    lastMessages.map((item) => [
      String(item._id),
      item.last_message_at,
    ])
  );

  return tickets.map((ticket) => ({
    ...ticket,
    last_message_at:
      ticket.last_message_at || lastMessageMap.get(getTicketId(ticket)) || null,
  }));
};

const sortTicketsByActivity = (tickets = []) =>
  [...tickets].sort((ticketA, ticketB) => {
    const timeA = new Date(
      ticketA.last_message_at || ticketA.created_at || 0
    ).getTime();

    const timeB = new Date(
      ticketB.last_message_at || ticketB.created_at || 0
    ).getTime();

    return timeB - timeA;
  });

// Customer tạo ticket hỗ trợ mới.
const createTicket = async (
  customerId,
  { subject, description, order_id, category }
) => {
  if (!subject || !subject.trim()) {
    throw new Error("Subject is required");
  }

  if (order_id) {
    const order = await Order.findOne({
      _id: order_id,
      user_id: customerId,
    });

    if (!order) {
      throw new Error("Order not found or does not belong to you");
    }
  }

  const ticket = await SupportTicket.create({
    user_id: customerId,
    order_id: order_id || null,
    subject: subject.trim(),
    description: description || null,
    category: category || "general",
    status: "open",
    last_message_at: null,
  });

  return getTicketSummaryById(ticket._id);
};

const createTicketFromChat = async (
  staffId,
  chatId,
  { subject, category }
) => {
  const conversation = await ChatConversation.findById(chatId);

  if (!conversation) {
    throw new Error("Chat conversation not found");
  }

  const chatMessages = await ChatMessage.find({
    conversation_id: chatId,
  }).sort({ created_at: 1 });

  let description =
    "Ticket được tạo từ cuộc hội thoại Chat.\n\n--- Nội dung Chat ---\n";

  chatMessages.forEach((message) => {
    const senderRole =
      String(message.sender_id) === String(conversation.customer_id)
        ? "Khách hàng"
        : "Nhân viên";

    description += `[${senderRole}]: ${
      message.message || "(Gửi tệp đính kèm)"
    }\n`;
  });

  const latestChatMessage = chatMessages[chatMessages.length - 1];

  const ticket = await SupportTicket.create({
    user_id: conversation.customer_id,
    assigned_staff_id: staffId,
    subject: subject || "Hỗ trợ từ Chat",
    description,
    category: category || "general",
    status: "in_progress",
    last_message_at: latestChatMessage?.created_at || new Date(),
  });

  conversation.status = "closed";
  await conversation.save();

  return getTicketSummaryById(ticket._id);
};

const getCustomerTickets = async (customerId) => {
  const tickets = await populateTicketQuery(
    SupportTicket.find({ user_id: customerId })
  ).lean();

  return sortTicketsByActivity(
    await attachLegacyLastMessageDates(tickets)
  );
};

const getTicketDetails = async (ticketId, userId, role) => {
  const ticket = await getTicketSummaryById(ticketId);

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  assertTicketAccess(ticket, userId, role);

  const messages = await TicketMessage.find({ ticket_id: ticketId })
    .populate("sender_id", "name email img_url avatar avatar_url")
    .sort({ created_at: 1 })
    .lean();

  if (!ticket.last_message_at && messages.length > 0) {
    ticket.last_message_at = messages[messages.length - 1].created_at;
  }

  return { ticket, messages };
};

const addMessage = async (
  ticketId,
  senderId,
  message,
  attachments = [],
  role
) => {
  const cleanMessage = String(message || "").trim();
  const cleanAttachments = normalizeAttachments(attachments);

  if (!cleanMessage && cleanAttachments.length === 0) {
    throw new Error("Message content cannot be empty");
  }

  const ticket = await SupportTicket.findById(ticketId);

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  assertTicketAccess(ticket, senderId, role, {
    requireAssignedForStaff: normalizeRole(role) === "STAFF",
  });

  const ticketMessage = await TicketMessage.create({
    ticket_id: ticketId,
    sender_id: senderId,
    message: cleanMessage,
    attachments: cleanAttachments,
  });

  ticket.last_message_at = ticketMessage.created_at || new Date();
  await ticket.save();

  return TicketMessage.findById(ticketMessage._id)
    .populate("sender_id", "name email img_url avatar avatar_url")
    .lean();
};

const closeTicket = async (ticketId, userId) => {
  const ticket = await SupportTicket.findById(ticketId);

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  if (String(ticket.user_id) !== String(userId)) {
    throw new Error("Unauthorized to close this ticket");
  }

  ticket.status = "closed";
  ticket.closed_at = new Date();
  await ticket.save();

  return getTicketSummaryById(ticket._id);
};

// STAFF chỉ thấy ticket chưa có người nhận hoặc ticket của chính mình.
// ADMIN/MANAGER vẫn thấy toàn bộ ticket.
const getAdminTickets = async ({
  status,
  assigned_staff_id,
  requesterId,
  requesterRole,
}) => {
  const filter = {};
  const roleUpper = normalizeRole(requesterRole);

  if (status) {
    filter.status = status;
  }

  if (roleUpper === "STAFF") {
    filter.$or = [
      { assigned_staff_id: null },
      { assigned_staff_id: requesterId },
    ];
  } else if (assigned_staff_id) {
    filter.assigned_staff_id = assigned_staff_id;
  }

  const tickets = await populateTicketQuery(
    SupportTicket.find(filter)
  ).lean();

  return sortTicketsByActivity(
    await attachLegacyLastMessageDates(tickets)
  );
};

const assignTicket = async (
  ticketId,
  assignedStaffId,
  requesterId,
  requesterRole
) => {
  const roleUpper = normalizeRole(requesterRole);
  const targetStaffId = String(assignedStaffId || "");
  const currentUserId = String(requesterId || "");

  if (roleUpper === "STAFF" && targetStaffId !== currentUserId) {
    throw new Error("Staff can only claim a ticket for themselves");
  }

  const staff = await User.findById(targetStaffId).populate("role_id", "code");

  if (!staff) {
    throw new Error("Staff user not found");
  }

  const targetRole = normalizeRole(staff.role_id?.code);

  if (!["STAFF", "ADMIN", "MANAGER"].includes(targetRole)) {
    throw new Error("Assigned user is not a support staff member");
  }

  const existingTicket = await SupportTicket.findById(ticketId).lean();

  if (!existingTicket) {
    throw new Error("Support ticket not found");
  }

  if (existingTicket.status === "closed") {
    throw new Error("Closed ticket cannot be claimed");
  }

  const existingAssignee = getAssignedStaffId(existingTicket);

  if (existingAssignee && existingAssignee !== targetStaffId) {
    throw new Error("Ticket has already been claimed by another staff member");
  }

  const ticket = await SupportTicket.findOneAndUpdate(
    {
      _id: ticketId,
      $or: [
        { assigned_staff_id: null },
        { assigned_staff_id: targetStaffId },
      ],
    },
    {
      $set: {
        assigned_staff_id: targetStaffId,
        status: "in_progress",
        closed_at: null,
      },
    },
    { new: true }
  );

  if (!ticket) {
    throw new Error("Ticket has already been claimed by another staff member");
  }

  return getTicketSummaryById(ticket._id);
};

const updateTicketStatus = async (
  ticketId,
  { status },
  requesterId,
  requesterRole
) => {
  const ticket = await SupportTicket.findById(ticketId);

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  assertTicketAccess(ticket, requesterId, requesterRole, {
    requireAssignedForStaff: normalizeRole(requesterRole) === "STAFF",
  });

  ticket.status = status;

  if (status === "closed") {
    ticket.closed_at = new Date();
  } else {
    ticket.closed_at = null;
  }

  await ticket.save();

  return getTicketSummaryById(ticket._id);
};

module.exports = {
  createTicket,
  createTicketFromChat,
  getCustomerTickets,
  getTicketDetails,
  getTicketSummaryById,
  addMessage,
  closeTicket,
  getAdminTickets,
  assignTicket,
  updateTicketStatus,
};