const mongoose = require("mongoose");

const SupportTicket = require("../models/SupportTicket.model");
const TicketMessage = require("../models/TicketMessage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateTicketQuery = (query) => {
  return query
    .populate("user_id", "name email phone img_url")
    .populate("assigned_staff_id", "name email phone img_url")
    .populate("order_id", "payment_status total_amount")
    .select("-__v");
};

const createTicket = async (req, res) => {
  try {
    const {
      user_id,
      assigned_staff_id,
      order_id,
      subject,
      description,
      status,
    } = req.body;

    if (!user_id || !subject) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập người dùng và tiêu đề ticket.",
      });
    }

    if (!isValidObjectId(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã người dùng không hợp lệ.",
      });
    }

    if (assigned_staff_id && !isValidObjectId(assigned_staff_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên hỗ trợ không hợp lệ.",
      });
    }

    if (order_id && !isValidObjectId(order_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ.",
      });
    }

    const ticket = await SupportTicket.create({
      user_id,
      assigned_staff_id: assigned_staff_id || null,
      order_id: order_id || null,
      subject: subject.trim(),
      description: description?.trim() || null,
      status: status || "open",
    });

    if (description?.trim()) {
      await TicketMessage.create({
        ticket_id: ticket._id,
        sender_id: user_id,
        message: description.trim(),
      });
    }

    const data = await populateTicketQuery(
      SupportTicket.findById(ticket._id),
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Đã tạo ticket hỗ trợ.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không tạo được ticket hỗ trợ.",
      error: error.message,
    });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const { user_id, assigned_staff_id, order_id, status } = req.query;

    const filter = {};

    if (user_id) {
      if (!isValidObjectId(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Mã người dùng không hợp lệ.",
        });
      }

      filter.user_id = user_id;
    }

    if (assigned_staff_id) {
      if (!isValidObjectId(assigned_staff_id)) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên hỗ trợ không hợp lệ.",
        });
      }

      filter.assigned_staff_id = assigned_staff_id;
    }

    if (order_id) {
      if (!isValidObjectId(order_id)) {
        return res.status(400).json({
          success: false,
          message: "Mã đơn hàng không hợp lệ.",
        });
      }

      filter.order_id = order_id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const data = await populateTicketQuery(SupportTicket.find(filter))
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
      message: "Không tải được danh sách ticket.",
      error: error.message,
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã ticket không hợp lệ.",
      });
    }

    const ticket = await populateTicketQuery(SupportTicket.findById(id)).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ticket.",
      });
    }

    const messages = await TicketMessage.find({
      ticket_id: id,
    })
      .populate("sender_id", "name email img_url role_id")
      .select("-__v")
      .sort({
        created_at: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ticket,
        messages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không tải được chi tiết ticket.",
      error: error.message,
    });
  }
};

const updateTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã ticket không hợp lệ.",
      });
    }

    const updateData = {};

    for (const field of [
      "assigned_staff_id",
      "order_id",
      "subject",
      "description",
      "status",
    ]) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.assigned_staff_id === "") {
      updateData.assigned_staff_id = null;
    }

    if (updateData.order_id === "") {
      updateData.order_id = null;
    }

    if (
      updateData.assigned_staff_id &&
      !isValidObjectId(updateData.assigned_staff_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên hỗ trợ không hợp lệ.",
      });
    }

    if (updateData.order_id && !isValidObjectId(updateData.order_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ.",
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để cập nhật.",
      });
    }

    const data = await populateTicketQuery(
      SupportTicket.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }),
    ).lean();

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ticket.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật ticket.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không cập nhật được ticket.",
      error: error.message,
    });
  }
};

const deleteTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã ticket không hợp lệ.",
      });
    }

    const data = await SupportTicket.findByIdAndDelete(id).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ticket.",
      });
    }

    await TicketMessage.deleteMany({
      ticket_id: id,
    });

    return res.status(200).json({
      success: true,
      message: "Đã xóa ticket.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không xóa được ticket.",
      error: error.message,
    });
  }
};

const createTicketMessage = async (req, res) => {
  try {
    const ticket_id = req.params.ticketId || req.body.ticket_id;
    const { sender_id, message } = req.body;

    if (!ticket_id || !sender_id || !message) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đủ ticket, người gửi và nội dung tin nhắn.",
      });
    }

    if (!isValidObjectId(ticket_id) || !isValidObjectId(sender_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã ticket hoặc người gửi không hợp lệ.",
      });
    }

    const ticket = await SupportTicket.findById(ticket_id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ticket.",
      });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Ticket đã đóng, không thể gửi thêm tin nhắn.",
      });
    }

    const data = await TicketMessage.create({
      ticket_id,
      sender_id,
      message: message.trim(),
    });

    ticket.updated_at = new Date();
    await ticket.save();

    const populatedMessage = await TicketMessage.findById(data._id)
      .populate("sender_id", "name email img_url role_id")
      .select("-__v")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Đã gửi tin nhắn.",
      data: populatedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không gửi được tin nhắn.",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicketById,
  deleteTicketById,
  createTicketMessage,
};