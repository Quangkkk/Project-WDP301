const mongoose = require("mongoose");
const supportService = require("../services/support.service");
const SupportTicket = require("../models/SupportTicket.model");
const TicketMessage = require("../models/TicketMessage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeRole = (role) => String(role || "").toUpperCase();

const createTicket = async (req, res) => {
  try {
    const { subject, description, order_id } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (order_id && !isValidObjectId(order_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order_id",
      });
    }

    const data = await supportService.createTicket(req.user_id, {
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
    const statusCode =
      error.message.includes("not found") ||
      error.message.includes("belong to you") ||
      error.message.includes("required")
        ? 400
        : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create support ticket",
      error: error.message,
    });
  }
};

const getCustomerTickets = async (req, res) => {
  try {
    const data = await supportService.getCustomerTickets(req.user_id);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get support tickets",
      error: error.message,
    });
  }
};

const getAdminTickets = async (req, res) => {
  try {
    const { status, assigned_staff_id } = req.query;

    if (assigned_staff_id && !isValidObjectId(assigned_staff_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned_staff_id",
      });
    }

    const data = await supportService.getAdminTickets({
      status,
      assigned_staff_id,
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get admin support tickets",
      error: error.message,
    });
  }
};

const getTickets = async (req, res) => {
  if (normalizeRole(req.role) === "CUSTOMER") {
    return getCustomerTickets(req, res);
  }
  return getAdminTickets(req, res);
};

const getTicketMessages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    const data = await supportService.getTicketDetails(
      id,
      req.user_id,
      req.role
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") statusCode = 404;
    if (error.message.includes("Unauthorized")) statusCode = 403;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get ticket messages",
      error: error.message,
    });
  }
};

const createMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    const data = await supportService.addMessage(
      id,
      req.user_id,
      req.body.message,
      req.role
    );

    return res.status(201).json({
      success: true,
      message: "Send message successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") statusCode = 404;
    if (error.message.includes("Unauthorized")) statusCode = 403;
    if (error.message.includes("empty")) statusCode = 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to send message",
      error: error.message,
    });
  }
};

const createCustomerMessage = createMessage;
const createAdminMessage = createMessage;

const closeCustomerTicket = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    const data = await supportService.closeTicket(id, req.user_id);

    return res.status(200).json({
      success: true,
      message: "Close support ticket successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Support ticket not found") statusCode = 404;
    if (error.message.includes("Unauthorized")) statusCode = 403;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to close ticket",
      error: error.message,
    });
  }
};

const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_staff_id } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    if (!assigned_staff_id || !isValidObjectId(assigned_staff_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid assigned_staff_id is required",
      });
    }

    const data = await supportService.assignTicket(id, assigned_staff_id);
    return res.status(200).json({
      success: true,
      message: "Assign ticket successfully",
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to assign ticket",
      error: error.message,
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = ["open", "in_progress", "closed"];
    if (!allowedStatuses.includes(String(status).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status",
      });
    }

    const data = await supportService.updateTicketStatus(id, {
      status: String(status).toLowerCase(),
    });

    return res.status(200).json({
      success: true,
      message: "Update ticket status successfully",
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update ticket status",
      error: error.message,
    });
  }
};

const updateTicket = async (req, res) => {
  const role = normalizeRole(req.role);

  if (role === "CUSTOMER") {
    if (String(req.body.status || "").toLowerCase() !== "closed") {
      return res.status(403).json({
        success: false,
        message: "Customer can only close their own ticket",
      });
    }
    return closeCustomerTicket(req, res);
  }

  try {
    const { id } = req.params;
    let data = null;

    if (req.body.assigned_staff_id) {
      data = await supportService.assignTicket(id, req.body.assigned_staff_id);
    }

    if (req.body.status) {
      data = await supportService.updateTicketStatus(id, {
        status: String(req.body.status).toLowerCase(),
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update ticket successfully",
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update ticket",
      error: error.message,
    });
  }
};

const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket id" });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const role = normalizeRole(req.role);
    if (
      role === "CUSTOMER" &&
      String(ticket.user_id) !== String(req.user_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this ticket",
      });
    }

    await Promise.all([
      SupportTicket.findByIdAndDelete(id),
      TicketMessage.deleteMany({ ticket_id: id }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Delete ticket successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getCustomerTickets,
  getAdminTickets,
  getTicketMessages,
  createMessage,
  createCustomerMessage,
  createAdminMessage,
  closeCustomerTicket,
  assignTicket,
  updateTicketStatus,
  updateTicket,
  deleteTicket,
};
