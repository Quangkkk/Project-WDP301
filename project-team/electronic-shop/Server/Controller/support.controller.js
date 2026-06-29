const mongoose = require("mongoose");

const SupportTicket = require("../models/SupportTicket.model");
const TicketMessage = require("../models/TicketMessage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createTicket = async (req, res) => {
  try {
    const { user_id, assigned_staff_id, order_id, subject, description, status } = req.body;
    if (!user_id || !subject) return res.status(400).json({ success: false, message: "user_id and subject are required" });
    if (!isValidObjectId(user_id)) return res.status(400).json({ success: false, message: "Invalid user_id" });
    if (assigned_staff_id && !isValidObjectId(assigned_staff_id)) return res.status(400).json({ success: false, message: "Invalid assigned_staff_id" });
    if (order_id && !isValidObjectId(order_id)) return res.status(400).json({ success: false, message: "Invalid order_id" });

    const data = await SupportTicket.create({
      user_id,
      assigned_staff_id: assigned_staff_id || null,
      order_id: order_id || null,
      subject,
      description: description || null,
      status: status || "open",
    });

    return res.status(201).json({ success: true, message: "Create support ticket successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create support ticket", error: error.message });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const { user_id, assigned_staff_id, order_id, status } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (assigned_staff_id) filter.assigned_staff_id = assigned_staff_id;
    if (order_id) filter.order_id = order_id;
    if (status) filter.status = status;

    const data = await SupportTicket.find(filter)
      .populate("user_id", "name email phone")
      .populate("assigned_staff_id", "name email phone")
      .populate("order_id", "payment_status total_amount")
      .select("-__v")
      .sort({ created_at: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get support tickets", error: error.message });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid ticket id" });

    const ticket = await SupportTicket.findById(id)
      .populate("user_id", "name email phone")
      .populate("assigned_staff_id", "name email phone")
      .populate("order_id", "payment_status total_amount")
      .select("-__v")
      .lean();

    if (!ticket) return res.status(404).json({ success: false, message: "Support ticket not found" });

    const messages = await TicketMessage.find({ ticket_id: id })
      .populate("sender_id", "name email img_url")
      .select("-__v")
      .sort({ created_at: 1 });

    return res.status(200).json({ success: true, data: { ticket, messages } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get support ticket", error: error.message });
  }
};

const updateTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid ticket id" });

    const updateData = {};
    for (const field of ["assigned_staff_id", "order_id", "subject", "description", "status"]) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    if (updateData.assigned_staff_id && !isValidObjectId(updateData.assigned_staff_id)) return res.status(400).json({ success: false, message: "Invalid assigned_staff_id" });
    if (updateData.order_id && !isValidObjectId(updateData.order_id)) return res.status(400).json({ success: false, message: "Invalid order_id" });
    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await SupportTicket.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Support ticket not found" });
    return res.status(200).json({ success: true, message: "Update support ticket successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update support ticket", error: error.message });
  }
};

const deleteTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid ticket id" });

    const data = await SupportTicket.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Support ticket not found" });

    await TicketMessage.deleteMany({ ticket_id: id });
    return res.status(200).json({ success: true, message: "Delete support ticket successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete support ticket", error: error.message });
  }
};

const createTicketMessage = async (req, res) => {
  try {
    const ticket_id = req.params.ticketId || req.body.ticket_id;
    const { sender_id, message } = req.body;
    if (!ticket_id || !sender_id || !message) return res.status(400).json({ success: false, message: "ticket_id, sender_id and message are required" });
    if (!isValidObjectId(ticket_id) || !isValidObjectId(sender_id)) return res.status(400).json({ success: false, message: "Invalid ticket_id or sender_id" });

    const ticket = await SupportTicket.findById(ticket_id);
    if (!ticket) return res.status(404).json({ success: false, message: "Support ticket not found" });

    const data = await TicketMessage.create({ ticket_id, sender_id, message });
    return res.status(201).json({ success: true, message: "Create ticket message successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create ticket message", error: error.message });
  }
};

module.exports = { createTicket, getAllTickets, getTicketById, updateTicketById, deleteTicketById, createTicketMessage };
