const mongoose = require("mongoose");

const ChatConversation = require("../models/ChatConversation.model");
const ChatMessage = require("../models/ChatMessage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateConversation = (query) => {
  return query
    .populate("customer_id", "name email phone img_url")
    .populate("staff_id", "name email phone img_url")
    .select("-__v");
};

const populateMessage = (query) => {
  return query
    .populate("sender_id", "name email img_url role_id")
    .select("-__v");
};

const normalizeConversationData = (body) => {
  return {
    customer_id: body.customer_id || body.user_id || null,
    staff_id: body.staff_id || body.assigned_staff_id || null,
    title: body.title || body.subject || "Hỗ trợ khách hàng",
    status: body.status || "open",
  };
};

const getOrCreateConversation = async (req, res) => {
  try {
    const { customer_id, user_id } = req.body;
    const finalCustomerId = customer_id || user_id;

    if (!finalCustomerId || !isValidObjectId(finalCustomerId)) {
      return res.status(400).json({
        success: false,
        message: "Mã khách hàng không hợp lệ.",
      });
    }

    let conversation = await ChatConversation.findOne({
      customer_id: finalCustomerId,
      status: {
        $ne: "closed",
      },
    }).sort({
      updated_at: -1,
      created_at: -1,
    });

    if (!conversation) {
      conversation = await ChatConversation.create({
        customer_id: finalCustomerId,
        staff_id: null,
        title: "Hỗ trợ khách hàng",
        status: "open",
      });
    }

    const data = await populateConversation(
      ChatConversation.findById(conversation._id),
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Đã mở cuộc trò chuyện.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không mở được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const createConversation = async (req, res) => {
  try {
    const data = normalizeConversationData(req.body);

    if (!data.customer_id || !isValidObjectId(data.customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã khách hàng không hợp lệ.",
      });
    }

    if (data.staff_id && !isValidObjectId(data.staff_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }

    const conversation = await ChatConversation.create(data);

    const populated = await populateConversation(
      ChatConversation.findById(conversation._id),
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Đã tạo cuộc trò chuyện.",
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không tạo được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const getConversations = async (req, res) => {
  try {
    const { customer_id, user_id, staff_id, status } = req.query;

    const filter = {};

    const finalCustomerId = customer_id || user_id;

    if (finalCustomerId) {
      if (!isValidObjectId(finalCustomerId)) {
        return res.status(400).json({
          success: false,
          message: "Mã khách hàng không hợp lệ.",
        });
      }

      filter.customer_id = finalCustomerId;
    }

    if (staff_id) {
      if (!isValidObjectId(staff_id)) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên không hợp lệ.",
        });
      }

      filter.staff_id = staff_id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const data = await populateConversation(ChatConversation.find(filter))
      .sort({
        updated_at: -1,
        created_at: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không tải được danh sách cuộc trò chuyện.",
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

    const conversation = await populateConversation(
      ChatConversation.findById(id),
    ).lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc trò chuyện.",
      });
    }

    const messages = await populateMessage(
      ChatMessage.find({
        conversation_id: id,
      }).sort({
        created_at: 1,
      }),
    ).lean();

    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không tải được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện không hợp lệ.",
      });
    }

    const updateData = {};

    if (req.body.staff_id !== undefined) {
      updateData.staff_id = req.body.staff_id || null;
    }

    if (req.body.assigned_staff_id !== undefined) {
      updateData.staff_id = req.body.assigned_staff_id || null;
    }

    if (req.body.status !== undefined) {
      updateData.status = req.body.status;
    }

    if (req.body.title !== undefined) {
      updateData.title = req.body.title;
    }

    if (updateData.staff_id && !isValidObjectId(updateData.staff_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }

    const data = await populateConversation(
      ChatConversation.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }),
    ).lean();

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc trò chuyện.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật cuộc trò chuyện.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không cập nhật được cuộc trò chuyện.",
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const conversation_id = req.params.conversationId || req.body.conversation_id;
    const { sender_id, message } = req.body;

    if (!conversation_id || !sender_id || !message) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung tin nhắn.",
      });
    }

    if (!isValidObjectId(conversation_id) || !isValidObjectId(sender_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện hoặc người gửi không hợp lệ.",
      });
    }

    const conversation = await ChatConversation.findById(conversation_id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc trò chuyện.",
      });
    }

    if (conversation.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cuộc trò chuyện đã đóng, không thể gửi thêm tin nhắn.",
      });
    }

    const createdMessage = await ChatMessage.create({
      conversation_id,
      sender_id,
      message: message.trim(),
      is_read: false,
    });

    conversation.last_message = message.trim();
    conversation.updated_at = new Date();
    await conversation.save();

    const data = await populateMessage(ChatMessage.findById(createdMessage._id)).lean();

    return res.status(201).json({
      success: true,
      message: "Đã gửi tin nhắn.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không gửi được tin nhắn.",
      error: error.message,
    });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { user_id } = req.body;

    if (!conversationId || !isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Mã cuộc trò chuyện không hợp lệ.",
      });
    }

    const filter = {
      conversation_id: conversationId,
      is_read: false,
    };

    if (user_id && isValidObjectId(user_id)) {
      filter.sender_id = {
        $ne: user_id,
      };
    }

    await ChatMessage.updateMany(filter, {
      is_read: true,
      read_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Đã đánh dấu đã đọc.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không cập nhật được trạng thái đã đọc.",
      error: error.message,
    });
  }
};

module.exports = {
  getOrCreateConversation,
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
  sendMessage,
  markMessagesAsRead,
};