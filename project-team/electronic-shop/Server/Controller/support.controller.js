const mongoose = require("mongoose");
const supportService = require("../services/support.service");
const SupportTicket = require("../models/SupportTicket.model");
const TicketMessage = require("../models/TicketMessage.model");
const attachmentUpload = require("../middleware/attachmentUpload");
const { uploadFiles } = require("../services/cloudinaryUpload.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeRole = (role) => String(role || "").toUpperCase();
const getEntityId = (value) => String(value?._id || value || "");

const emitToCustomerRoom = (io, ticket, eventName, payload) => {
  const customerId = getEntityId(ticket?.user_id);

  if (io && customerId) {
    io.to(`user_${customerId}`).emit(eventName, payload);
  }
};

const emitTicketCreated = (io, ticket) => {
  if (!io || !ticket) return;

  const payload = { ticket };

  io.to("staff_room").emit("support_ticket_created", payload);
  emitToCustomerRoom(io, ticket, "support_ticket_created", payload);
};

const emitTicketUpdated = (io, ticket) => {
  if (!io || !ticket) return;

  const payload = { ticket };

  io.to("staff_room").emit("support_ticket_updated", payload);
  emitToCustomerRoom(io, ticket, "support_ticket_updated", payload);
};

const emitTicketDeleted = (io, ticketId, ticket) => {
  if (!io || !ticketId) return;

  const payload = {
    ticketId: String(ticketId),
  };

  io.to("staff_room").emit("support_ticket_deleted", payload);
  emitToCustomerRoom(io, ticket, "support_ticket_deleted", payload);
};

const uploadSupportFiles = (req, res, next) => {
  attachmentUpload.array("files", 5)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Mỗi file không được vượt quá 10MB."
            : error.code === "LIMIT_FILE_COUNT"
              ? "Chỉ được tải tối đa 5 file mỗi lần."
              : error.message || "Không tải được file lên.",
      });
    }

    return next();
  });
};

const uploadSupportAttachments = async (req, res) => {
  try {
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất một file.",
      });
    }

    const data = await uploadFiles(req.files, {
      folder: process.env.CLOUDINARY_SUPPORT_FOLDER || "techsale/support",
      resourceType: "auto",
    });

    return res.status(201).json({
      success: true,
      message: "Đã tải file ticket lên Cloudinary.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không tải được file ticket lên Cloudinary.",
      error: error.message,
    });
  }
};

const createTicketFromChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { subject, category } = req.body;

    if (!isValidObjectId(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat id",
      });
    }

    const data = await supportService.createTicketFromChat(
      req.user_id,
      chatId,
      { subject, category }
    );

    emitTicketCreated(req.app.get("io"), data);

    return res.status(201).json({
      success: true,
      message: "Chuyển hội thoại thành ticket thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create ticket from chat",
      error: error.message,
    });
  }
};

const createTicket = async (req, res) => {
  try {
    const { subject, description, order_id, category } = req.body;

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
      category,
    });

    emitTicketCreated(req.app.get("io"), data);

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
      requesterId: req.user_id,
      requesterRole: req.role,
    });

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

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message === "Support ticket not found") {
      statusCode = 404;
    }

    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("another staff")
    ) {
      statusCode = 403;
    }

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
      req.body.attachments,
      req.role
    );

    const ticket = await supportService.getTicketSummaryById(id);
    const io = req.app.get("io");
    const roleUpper = normalizeRole(req.role);

    if (io && ticket) {
      const payload = {
        ticketId: String(id),
        message: data,
        ticket,
      };

      if (["ADMIN", "MANAGER", "STAFF"].includes(roleUpper)) {
        emitToCustomerRoom(
          io,
          ticket,
          "customer_receive_ticket_message",
          payload
        );

        // Các Staff/Admin/Manager khác chỉ cần cập nhật summary của ticket.
        io.to("staff_room").emit("support_ticket_updated", { ticket });
      } else if (roleUpper === "CUSTOMER") {
        const assignedStaffId = getEntityId(ticket.assigned_staff_id);

        if (assignedStaffId) {
          io.to(`user_${assignedStaffId}`).emit(
            "staff_receive_ticket_message",
            payload
          );
        } else {
          io.to("staff_room").emit(
            "staff_receive_ticket_message",
            payload
          );
        }

        // Admin/Manager và các trang đang mở vẫn nhận được summary mới.
        io.to("staff_room").emit("support_ticket_updated", { ticket });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Send message successfully",
      data,
      ticket,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message === "Support ticket not found") {
      statusCode = 404;
    }

    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("another staff") ||
      error.message.includes("claim this ticket")
    ) {
      statusCode = 403;
    }

    if (error.message.includes("empty")) {
      statusCode = 400;
    }

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

    emitTicketUpdated(req.app.get("io"), data);

    return res.status(200).json({
      success: true,
      message: "Close support ticket successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message === "Support ticket not found") {
      statusCode = 404;
    }

    if (error.message.includes("Unauthorized")) {
      statusCode = 403;
    }

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

    const data = await supportService.assignTicket(
      id,
      assigned_staff_id,
      req.user_id,
      req.role
    );

    const io = req.app.get("io");

    if (io) {
      io.to("staff_room").emit("support_ticket_assigned", {
        ticketId: String(id),
        assignedStaffId: String(assigned_staff_id),
        ticket: data,
      });

      emitToCustomerRoom(io, data, "support_ticket_updated", {
        ticket: data,
      });
    }

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

    if (
      error.message.includes("already been claimed") ||
      error.message.includes("cannot be claimed")
    ) {
      statusCode = 409;
    }

    if (
      error.message.includes("only claim") ||
      error.message.includes("not a support staff")
    ) {
      statusCode = 403;
    }

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

    const normalizedStatus = String(status).toLowerCase();
    const allowedStatuses = ["open", "in_progress", "closed"];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status",
      });
    }

    const data = await supportService.updateTicketStatus(
      id,
      { status: normalizedStatus },
      req.user_id,
      req.role
    );

    emitTicketUpdated(req.app.get("io"), data);

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

    if (
      error.message.includes("another staff") ||
      error.message.includes("claim this ticket") ||
      error.message.includes("Unauthorized")
    ) {
      statusCode = 403;
    }

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

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    let data = null;
    let assignmentChanged = false;
    let statusChanged = false;

    if (req.body.assigned_staff_id) {
      data = await supportService.assignTicket(
        id,
        req.body.assigned_staff_id,
        req.user_id,
        req.role
      );

      assignmentChanged = true;
    }

    if (req.body.status) {
      const normalizedStatus = String(req.body.status).toLowerCase();
      const allowedStatuses = ["open", "in_progress", "closed"];

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket status",
        });
      }

      data = await supportService.updateTicketStatus(
        id,
        { status: normalizedStatus },
        req.user_id,
        req.role
      );

      statusChanged = true;
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    const io = req.app.get("io");

    if (io && assignmentChanged) {
      io.to("staff_room").emit("support_ticket_assigned", {
        ticketId: String(id),
        assignedStaffId: getEntityId(data.assigned_staff_id),
        ticket: data,
      });

      emitToCustomerRoom(io, data, "support_ticket_updated", {
        ticket: data,
      });
    }

    if (io && statusChanged) {
      emitTicketUpdated(io, data);
    }

    return res.status(200).json({
      success: true,
      message: "Update ticket successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message.includes("not found")) {
      statusCode = 404;
    }

    if (error.message.includes("already been claimed")) {
      statusCode = 409;
    }

    if (
      error.message.includes("another staff") ||
      error.message.includes("claim this ticket") ||
      error.message.includes("only claim") ||
      error.message.includes("Unauthorized")
    ) {
      statusCode = 403;
    }

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
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
      });
    }

    const ticket = await supportService.getTicketSummaryById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const role = normalizeRole(req.role);

    if (
      role === "CUSTOMER" &&
      getEntityId(ticket.user_id) !== String(req.user_id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this ticket",
      });
    }

    if (role === "STAFF") {
      const assignedStaffId = getEntityId(ticket.assigned_staff_id);

      if (!assignedStaffId || assignedStaffId !== String(req.user_id)) {
        return res.status(403).json({
          success: false,
          message: "Staff can only delete their own assigned ticket",
        });
      }
    }

    await Promise.all([
      SupportTicket.findByIdAndDelete(id),
      TicketMessage.deleteMany({ ticket_id: id }),
    ]);

    emitTicketDeleted(req.app.get("io"), id, ticket);

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
  uploadSupportFiles,
  uploadSupportAttachments,
  createTicket,
  createTicketFromChat,
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