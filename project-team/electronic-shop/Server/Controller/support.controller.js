const mongoose = require("mongoose");
const supportService = require("../services/support.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// -------------------------------------------------------------
// CUSTOMER CONTROLLERS
// -------------------------------------------------------------

// Customer tao ticket ho tro moi
const createTicket = async (req, res) => {
  try {
    const customerId = req.user_id;
    const { subject, description, order_id } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: "subject is required" });
    }

    if (order_id && !isValidObjectId(order_id)) {
      return res.status(400).json({ success: false, message: "Invalid order_id" });
    }

    const data = await supportService.createTicket(customerId, {
      subject,
      description,
      order_id,
    });

    return res.status(201).json({
      success: true,
      message: "Create support ticket successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("not found") || error.message.includes("belong to you") || error.message.includes("required")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create support ticket",
      error: error.message,
    });
  }
};

// Customer xem danh sach ticket ho tro cua minh
const getCustomerTickets = async (req, res) => {
  try {
    const customerId = req.user_id;
    const data = await supportService.getCustomerTickets(customerId);
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get support tickets",
      error: error.message,
    });
  }
};

// Customer xem chi tiet tin nhan cua ticket ho tro
const getTicketMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;
    const role = req.role;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    const result = await supportService.getTicketDetails(id, userId, role);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") {
      statusCode = 404;
    } else if (error.message.includes("Unauthorized")) {
      statusCode = 403;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get ticket messages",
      error: error.message,
    });
  }
};

// Customer gui tin nhan phan hoi trong ticket
const createCustomerMessage = async (req, res) => {
  try {
    const { id } = req.params; // Ticket ID
    const senderId = req.user_id;
    const { message } = req.body;
    const role = req.role;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    const data = await supportService.addMessage(id, senderId, message, role);
    return res.status(201).json({
      success: true,
      message: "Send message successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") {
      statusCode = 404;
    } else if (error.message.includes("Unauthorized") || error.message.includes("empty")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to send message",
      error: error.message,
    });
  }
};

// Customer tu dong ticket ho tro cua minh
const closeCustomerTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    const data = await supportService.closeTicket(id, userId);
    return res.status(200).json({
      success: true,
      message: "Close support ticket successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") {
      statusCode = 404;
    } else if (error.message.includes("Unauthorized")) {
      statusCode = 403;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to close ticket",
      error: error.message,
    });
  }
};

// -------------------------------------------------------------
// STAFF/MANAGER CONTROLLERS
// -------------------------------------------------------------

// Admin/Staff/Manager xem toan bo tickets
const getAdminTickets = async (req, res) => {
  try {
    const { status, assigned_staff_id } = req.query;

    if (assigned_staff_id && !isValidObjectId(assigned_staff_id)) {
      return res.status(400).json({ success: false, message: "Invalid assigned_staff_id" });
    }

    const data = await supportService.getAdminTickets({ status, assigned_staff_id });
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get admin support tickets",
      error: error.message,
    });
  }
};

// Admin/Staff/Manager chi dinh nhan vien cho ticket
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_staff_id } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    if (!assigned_staff_id || !isValidObjectId(assigned_staff_id)) {
      return res.status(400).json({ success: false, message: "Valid assigned_staff_id is required" });
    }

    const data = await supportService.assignTicket(id, assigned_staff_id);
    return res.status(200).json({
      success: true,
      message: "Assign ticket successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("not found")) {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to assign ticket",
      error: error.message,
    });
  }
};

// Admin/Staff/Manager cap nhat status ticket
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: "status is required" });
    }

    const data = await supportService.updateTicketStatus(id, { status });
    return res.status(200).json({
      success: true,
      message: "Update ticket status successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("not found")) {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update ticket status",
      error: error.message,
    });
  }
};

// Admin/Staff/Manager phan hoi/gui tin nhan giai quyet ticket
const createAdminMessage = async (req, res) => {
  try {
    const { id } = req.params; // Ticket ID
    const senderId = req.user_id;
    const { message } = req.body;
    const role = req.role;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    const data = await supportService.addMessage(id, senderId, message, role);
    return res.status(201).json({
      success: true,
      message: "Send admin reply message successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") {
      statusCode = 404;
    } else if (error.message.includes("empty")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to send message",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getCustomerTickets,
  getTicketMessages,
  createCustomerMessage,
  closeCustomerTicket,
  getAdminTickets,
  assignTicket,
  updateTicketStatus,
  createAdminMessage,
};
