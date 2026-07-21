const mongoose = require("mongoose");
const orderService = require("../services/order.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller tao don hang moi cho customer hoac guest
const createOrder = async (req, res) => {
  try {
    const orderData = { ...req.body };

    // Khong tin user_id frontend gui len. Neu co token thi lay user_id tu token.
    if (req.user_id) {
      orderData.user_id = req.user_id;
      delete orderData.session_id;
    } else {
      delete orderData.user_id;
    }

    const result = await orderService.createOrder(orderData);

    return res.status(201).json({
      success: true,
      message: "Tạo đơn hàng thành công.",
      data: result,
    });
  } catch (error) {
    console.error("[order.createOrder]", error);

    const message = String(error?.message || "");
    let statusCode = 500;

    if (
      message === "Shipping method not found" ||
      message === "Product not found" ||
      message === "Variant not found" ||
      message === "Coupon not found" ||
      message === "User not found"
    ) {
      statusCode = 404;
    } else if (
      message === "Cart is empty" ||
      message.includes("inactive") ||
      message.includes("Not enough stock") ||
      message.includes("must not be negative") ||
      message.includes("price is invalid") ||
      message.includes("variant_id") ||
      message.includes("Invalid payment method") ||
      message.includes("Coupon") ||
      message.includes("Minimum order") ||
      message.includes("limit reached") ||
      message.includes("Missing") ||
      message.includes("required") ||
      message.includes("guest session") ||
      message.includes("receiver_email") ||
      message.includes("cannot use coupon") ||
      message.includes("Cart identity")
    ) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      message: message || "Không tạo được đơn hàng.",
      error: message,
    });
  }
};

// Controller lay danh sach don hang
const getAllOrders = async (req, res) => {
  try {
    const currentUser = {
      user_id: req.user_id,
      role: req.role, // Lay tu verifyToken middleware (CUSTOMER, STAFF, MANAGER, ADMIN)
    };

    const data = await orderService.getAllOrders(req.query, currentUser);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("[order.getAllOrders]", error);
    let statusCode = 500;
    if (error.message.includes("Invalid")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: "Failed to get orders",
      error: error.message,
    });
  }
};

// Controller lay chi tiet don hang theo ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const currentUser = {
      user_id: req.user_id,
      role: req.role,
    };

    const data = await orderService.getOrderById(id, currentUser);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[order.getOrderById]", error);
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (error.message.includes("Access denied")) {
      statusCode = 403;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get order",
      error: error.message,
    });
  }
};

// Controller cap nhat don hang
const updateOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const data = await orderService.updateOrderById(id, req.body, req.user_id);

    return res.status(200).json({
      success: true,
      message: "Update order successfully",
      data,
    });
  } catch (error) {
    console.error("[order.updateOrderById]", error);
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (
      error.message.includes("Invalid") ||
      error.message === "No data to update" ||
      error.message.includes("Use the cancel order endpoint") ||
      error.message.includes("cannot be changed") ||
      error.message.includes("must be paid before completing")
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update order",
      error: error.message,
    });
  }
};

// Controller huy don hang
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const currentUser = {
      user_id: req.user_id,
      role: req.role,
    };

    const data = await orderService.cancelOrder(id, currentUser, cancel_reason);

    return res.status(200).json({
      success: true,
      message: "Cancel order successfully",
      data,
    });
  } catch (error) {
    console.error("[order.cancelOrder]", error);
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (error.message.includes("Access denied")) {
      statusCode = 403;
    } else if (
      error.message === "This order cannot be cancelled" ||
      error.message.includes("required") ||
      error.message.includes("Paid order cannot be cancelled") ||
      error.message.includes("already changed or cancelled")
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to cancel order",
      error: error.message,
    });
  }
};

// Tra cuu don hang cho khach vang lai (Guest)
const trackGuestOrder = async (req, res) => {
  try {
    const { order_code, contact } = req.body;

    if (!order_code || !contact) {
      return res.status(400).json({
        success: false,
        message: "order_code and contact (email or phone) are required",
      });
    }

    const data = await orderService.trackGuestOrder({ order_code, contact });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (error.message.includes("Access denied")) {
      statusCode = 403;
    } else if (error.message.includes("required") || error.message.includes("format")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to track order",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderById,
  cancelOrder,
  trackGuestOrder,
};