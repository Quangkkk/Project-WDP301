const mongoose = require("mongoose");
const chatService = require("../services/chat.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Customer tao cuoc hoi thoai (auto assign staff)
const createConversation = async (req, res) => {
  try {
    const customerId = req.user_id; // Lay tu verifyToken middleware
    if (!customerId || !isValidObjectId(customerId)) {
      return res.status(400).json({ success: false, message: "Valid customer ID from token is required" });
    }

    const data = await chatService.createConversation(customerId);
    return res.status(201).json({
      success: true,
      message: "Create or retrieve conversation successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
      error: error.message,
    });
  }
};

// Lay danh sach hoi thoai cho ca Customer va Staff
const getAllConversations = async (req, res) => {
  try {
    const userId = req.user_id;
    const role = req.role; // Lay tu token

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Valid user ID from token is required" });
    }

    const data = await chatService.getConversations(userId, role);
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get conversations",
      error: error.message,
    });
  }
};

// Lay danh sach messages cua 1 conversation (ho tro phan trang)
const getMessagesByConversation = async (req, res) => {
  try {
    const { id } = req.params; // Conversation ID
    const { page, limit } = req.query;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Valid conversation ID is required" });
    }

    const result = await chatService.getMessages(id, { page, limit });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Conversation not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: "Failed to get conversation messages",
      error: error.message,
    });
  }
};

// REST API fallback de gui tin nhan (neu client muon gui qua HTTP POST)
const createChatMessage = async (req, res) => {
  try {
    const conversationId = req.params.conversationId || req.body.conversation_id;
    const { message } = req.body;
    const senderId = req.user_id;

    if (!conversationId || !message) {
      return res.status(400).json({ success: false, message: "conversation_id and message are required" });
    }

    if (!isValidObjectId(conversationId) || !isValidObjectId(senderId)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    const data = await chatService.saveMessage({
      conversationId,
      senderId,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Create chat message successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Conversation not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: "Failed to create message",
      error: error.message,
    });
  }
};

module.exports = {
  createConversation,
  getAllConversations,
  getMessagesByConversation,
  createChatMessage,
};
