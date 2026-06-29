const mongoose = require("mongoose");

const ChatConversation = require("../models/ChatConversation.model");
const ChatMessage = require("../models/ChatMessage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createConversation = async (req, res) => {
  try {
    const { customer_id, staff_id, status } = req.body;
    if (!customer_id || !staff_id) return res.status(400).json({ success: false, message: "customer_id and staff_id are required" });
    if (!isValidObjectId(customer_id) || !isValidObjectId(staff_id)) {
      return res.status(400).json({ success: false, message: "Invalid customer_id or staff_id" });
    }

    const data = await ChatConversation.create({ customer_id, staff_id, status: status || "open" });
    return res.status(201).json({ success: true, message: "Create conversation successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create conversation", error: error.message });
  }
};

const getAllConversations = async (req, res) => {
  try {
    const { customer_id, staff_id, status } = req.query;
    const filter = {};
    if (customer_id) filter.customer_id = customer_id;
    if (staff_id) filter.staff_id = staff_id;
    if (status) filter.status = status;

    const data = await ChatConversation.find(filter)
      .populate("customer_id", "name email img_url")
      .populate("staff_id", "name email img_url")
      .select("-__v")
      .sort({ updated_at: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get conversations", error: error.message });
  }
};

const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid conversation id" });

    const conversation = await ChatConversation.findById(id)
      .populate("customer_id", "name email img_url")
      .populate("staff_id", "name email img_url")
      .select("-__v")
      .lean();

    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

    const messages = await ChatMessage.find({ conversation_id: id })
      .populate("sender_id", "name email img_url")
      .select("-__v")
      .sort({ created_at: 1 });

    return res.status(200).json({ success: true, data: { conversation, messages } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get conversation", error: error.message });
  }
};

const updateConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid conversation id" });

    const updateData = {};
    for (const field of ["staff_id", "status"]) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    if (updateData.staff_id && !isValidObjectId(updateData.staff_id)) return res.status(400).json({ success: false, message: "Invalid staff_id" });

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await ChatConversation.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Conversation not found" });
    return res.status(200).json({ success: true, message: "Update conversation successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update conversation", error: error.message });
  }
};

const createChatMessage = async (req, res) => {
  try {
    const conversation_id = req.params.conversationId || req.body.conversation_id;
    const message = req.body.message || req.body.messages;
    const { sender_id, attachments } = req.body;

    if (!conversation_id || !sender_id || !message) {
      return res.status(400).json({ success: false, message: "conversation_id, sender_id and message are required" });
    }
    if (!isValidObjectId(conversation_id) || !isValidObjectId(sender_id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation_id or sender_id" });
    }

    const conversation = await ChatConversation.findById(conversation_id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

    const data = await ChatMessage.create({ conversation_id, sender_id, message, attachments: attachments || [] });
    await ChatConversation.findByIdAndUpdate(conversation_id, { updated_at: new Date() });

    return res.status(201).json({ success: true, message: "Create chat message successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create chat message", error: error.message });
  }
};

const markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isValidObjectId(messageId)) return res.status(400).json({ success: false, message: "Invalid message id" });

    const data = await ChatMessage.findByIdAndUpdate(messageId, { is_read: true }, { new: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Message not found" });
    return res.status(200).json({ success: true, message: "Mark message read successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to mark message read", error: error.message });
  }
};

module.exports = { createConversation, getAllConversations, getConversationById, updateConversationById, createChatMessage, markMessageRead };
