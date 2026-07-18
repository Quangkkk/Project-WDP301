const fs = require("fs");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const chatService = require("../services/chat.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const CHAT_UPLOAD_DIR = path.join(__dirname, "../uploads/chat");

fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CHAT_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploader = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Định dạng file không được hỗ trợ."));
    }
    return cb(null, true);
  },
}).array("files", 5);

const uploadChatFiles = (req, res, next) => {
  uploader(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "File không được vượt quá 10MB."
            : error.message || "Không tải được file lên.",
      });
    }
    return next();
  });
};

const uploadChatAttachments = async (req, res) => {
  const baseUrl = (
    process.env.SERVER_URL ||
    process.env.API_URL ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");

  const data = (req.files || []).map((file) => ({
    original_name: file.originalname || file.filename,
    filename: file.filename,
    mime_type: file.mimetype,
    size: file.size,
    url: `${baseUrl}/uploads/chat/${file.filename}`,
    type: String(file.mimetype || "").startsWith("image/") ? "image" : "file",
  }));

  return res.status(201).json({
    success: true,
    message: "Đã tải file lên.",
    data,
  });
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
