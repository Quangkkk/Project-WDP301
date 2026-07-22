const mongoose = require("mongoose");
const chatService = require("../services/chat.service");
const attachmentUpload = require("../middleware/attachmentUpload");
const { uploadFiles } = require("../services/cloudinaryUpload.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const uploadChatFiles = (req, res, next) => {
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

const uploadChatAttachments = async (req, res) => {
  try {
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất một file.",
      });
    }

    const data = await uploadFiles(req.files, {
      folder: process.env.CLOUDINARY_CHAT_FOLDER || "techsale/chat",
      resourceType: "auto",
    });

    return res.status(201).json({
      success: true,
      message: "Đã tải file chat lên Cloudinary.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Không tải được file chat lên Cloudinary.",
      error: error.message,
    });
  }
};

const getOrCreateConversation = async (req, res) => {
  try {
    const customerId = req.user_id;
    const data = await chatService.createConversation(customerId);

    return res.status(200).json({
      success: true,
      message: "Đã mở cuộc trò chuyện.",
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không mở được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const createConversation = getOrCreateConversation;

const getConversations = async (req, res) => {
  try {
    const data = await chatService.getConversations(req.user_id, req.role, {
      status: req.query.status,
      customer_id: req.query.customer_id || req.query.user_id,
      staff_id: req.query.staff_id,
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    const statusCode = error.message.includes("Unauthorized") ? 403 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không tải được danh sách cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện không hợp lệ.",
      });
    }

    const data = await chatService.getMessages(id, {
      page: req.query.page,
      limit: req.query.limit,
      userId: req.user_id,
      role: req.role,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Conversation not found") statusCode = 404;
    if (error.message.includes("Unauthorized")) statusCode = 403;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không tải được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const getMessagesByConversation = getConversationById;

const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện không hợp lệ.",
      });
    }

    const data = await chatService.updateConversation(id, req.body);
    const io = req.app.get("io");

    if (io) {
      io.to(`conversation:${id}`).emit("chat:conversationUpdated", {
        conversationId: id,
        conversation: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật cuộc trò chuyện.",
      data,
    });
  } catch (error) {
    const statusCode = error.message === "Conversation not found" ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không cập nhật được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện không hợp lệ.",
      });
    }

    const data = await chatService.saveMessage({
      conversationId,
      senderId: req.user_id,
      role: req.role,
      message: req.body.message,
      attachments: req.body.attachments,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("receive_message", data);
      io.to(`conversation:${conversationId}`).emit("chat:newMessage", {
        conversationId,
        message: data,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Đã gửi tin nhắn.",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("Unauthorized")) statusCode = 403;
    if (
      error.message.includes("empty") ||
      error.message.includes("closed")
    ) {
      statusCode = 400;
    }
    if (error.message === "Conversation not found") statusCode = 404;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không gửi được tin nhắn.",
      error: error.message,
    });
  }
};

const createChatMessage = sendMessage;

const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện không hợp lệ.",
      });
    }

    await chatService.markMessagesAsRead(
      conversationId,
      req.user_id,
      req.role
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversationId}`).emit("chat:messagesRead", {
        conversationId,
        user_id: req.user_id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã đánh dấu đã đọc.",
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message.includes("Unauthorized")) statusCode = 403;
    if (error.message === "Conversation not found") statusCode = 404;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không cập nhật được trạng thái đã đọc.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadChatFiles,
  uploadChatAttachments,
  getOrCreateConversation,
  createConversation,
  getConversations,
  getAllConversations: getConversations,
  getConversationById,
  getMessagesByConversation,
  updateConversation,
  sendMessage,
  createChatMessage,
  markMessagesAsRead,
};