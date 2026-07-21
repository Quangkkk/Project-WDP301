const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket.model");
const TicketMessage = require("../models/TicketMessage.model");
const Order = require("../models/Orders.model");
const User = require("../models/User.model");
const ChatConversation = require("../models/ChatConversation.model");
const ChatMessage = require("../models/ChatMessage.model");

// Customer tao ticket ho tro moi
const createTicket = async (customerId, { subject, description, order_id, category }) => {
  if (!subject || !subject.trim()) {
    throw new Error("Subject is required");
  }

  // Validate order_id neu co truyen len
  if (order_id) {
    const order = await Order.findOne({ _id: order_id, user_id: customerId });
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
  });

  return ticket;
};

const createTicketFromChat = async (staffId, chatId, { subject, category }) => {
  const conversation = await ChatConversation.findById(chatId);
  if (!conversation) {
    throw new Error("Chat conversation not found");
  }

  const chatMessages = await ChatMessage.find({ conversation_id: chatId }).sort({ created_at: 1 });
  
  let description = "Ticket được tạo từ cuộc hội thoại Chat.\n\n--- Nội dung Chat ---\n";
  chatMessages.forEach(msg => {
    const role = String(msg.sender_id) === String(conversation.customer_id) ? "Khách hàng" : "Nhân viên";
    description += `[${role}]: ${msg.message || '(Gửi tệp đính kèm)'}\n`;
  });

  const ticket = await SupportTicket.create({
    user_id: conversation.customer_id,
    assigned_staff_id: staffId,
    subject: subject || "Hỗ trợ từ Chat",
    description: description,
    category: category || "general",
    status: "in_progress",
  });

  // Có thể tự động đóng chat nếu muốn, ở đây ta chỉ tạo ticket
  conversation.status = 'closed';
  await conversation.save();

  return ticket;
};

// Customer lay danh sach ticket ho tro cua rieng minh
const getCustomerTickets = async (customerId) => {
  return await SupportTicket.find({ user_id: customerId })
    .populate("assigned_staff_id", "name email phone")
    .populate("order_id", "total_amount status")
    .sort({ updated_at: -1 })
    .lean();
};

// Customer hoac Staff xem chi tiet ticket va danh sach tin nhan
const getTicketDetails = async (ticketId, userId, role) => {
  const ticket = await SupportTicket.findById(ticketId)
    .populate("user_id", "name email phone")
    .populate("assigned_staff_id", "name email phone")
    .populate("order_id", "total_amount status created_at")
    .lean();

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  // Neu la Customer thi phai la chu so huu ticket
  if (String(role).toUpperCase() === "CUSTOMER" && String(ticket.user_id?._id || ticket.user_id) !== String(userId)) {
    throw new Error("Unauthorized access to this ticket");
  }

  const messages = await TicketMessage.find({ ticket_id: ticketId })
    .populate("sender_id", "name email img_url")
    .sort({ created_at: 1 })
    .lean();

  return { ticket, messages };
};

// Them tin nhan vao ticket
const addMessage = async (ticketId, senderId, message, attachments = [], role) => {
  const cleanMessage = String(message || "").trim();
  const cleanAttachments = Array.isArray(attachments) ? attachments : [];

  if (!cleanMessage && cleanAttachments.length === 0) {
    throw new Error("Message content cannot be empty");
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  // Neu nguoi gui la Customer, kiem tra co phai chu so huu ticket khong
  if (String(role).toUpperCase() === "CUSTOMER" && String(ticket.user_id) !== String(senderId)) {
    throw new Error("Unauthorized to comment on this ticket");
  }

  const ticketMsg = await TicketMessage.create({
    ticket_id: ticketId,
    sender_id: senderId,
    message: cleanMessage,
    attachments: cleanAttachments,
  });

  // Cap nhat thoi gian cap nhat cuoc tro chuyen
  ticket.updated_at = new Date();
  await ticket.save();

  return await TicketMessage.findById(ticketMsg._id)
    .populate("sender_id", "name email img_url")
    .lean();
};

// Customer chu dong dong ticket cua minh
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

  return ticket;
};

// Admin/Manager/Staff doc toan bo tickets ho tro (co filters)
const getAdminTickets = async ({ status, assigned_staff_id }) => {
  const filter = {};
  if (status) filter.status = status;
  if (assigned_staff_id) filter.assigned_staff_id = assigned_staff_id;

  return await SupportTicket.find(filter)
    .populate("user_id", "name email phone")
    .populate("assigned_staff_id", "name email phone")
    .populate("order_id", "total_amount status")
    .sort({ created_at: -1 })
    .lean();
};

// Admin/Manager/Staff gan ticket cho mot nhan vien ho tro
const assignTicket = async (ticketId, assignedStaffId) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  const staff = await User.findById(assignedStaffId);
  if (!staff) {
    throw new Error("Staff user not found");
  }

  ticket.assigned_staff_id = assignedStaffId;
  // Tu dong chuyen sang in_progress neu dang la open
  if (ticket.status === "open") {
    ticket.status = "in_progress";
  }
  await ticket.save();

  return ticket;
};

// Admin/Manager/Staff cap nhat trang thai ticket ho tro
const updateTicketStatus = async (ticketId, { status }) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  ticket.status = status;
  if (status === "closed") {
    ticket.closed_at = new Date();
  } else {
    ticket.closed_at = null;
  }
  await ticket.save();

  return ticket;
};

module.exports = {
  createTicket,
  createTicketFromChat,
  getCustomerTickets,
  getTicketDetails,
  addMessage,
  closeTicket,
  getAdminTickets,
  assignTicket,
  updateTicketStatus,
};
