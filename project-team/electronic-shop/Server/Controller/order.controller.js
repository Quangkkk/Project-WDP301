const mongoose = require("mongoose");
const orderService = require("../services/order.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller tao don hang moi
const createOrder = async (req, res) => {
  try {
    const orderData = { ...req.body };

    // Uu tien gan user_id tu token de dam bao an toan
    if (req.user_id) {
      orderData.user_id = req.user_id;
    }

    if (!orderData.user_id || !isValidObjectId(orderData.user_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid user_id is required",
      });
    }

    const result = await orderService.createOrder(orderData);

    return res.status(201).json({
      success: true,
      message: "Create order successfully",
      data: result,
    });
  } catch (error) {
    console.error("[order.createOrder]", error);
    let statusCode = 500;
    if (
      error.message === "Shipping method not found" ||
      error.message === "Product not found" ||
      error.message === "Variant not found" ||
      error.message === "Coupon not found"
    ) {
      statusCode = 404;
    } else if (
      error.message === "Cart is empty" ||
      error.message.includes("is inactive") ||
      error.message.includes("Not enough stock") ||
      error.message.includes("must not be negative") ||
      error.message.includes("price is invalid") ||
      error.message.includes("variant_id") ||
      error.message.includes("Invalid payment method") ||
      error.message.includes("Coupon") ||
      error.message.includes("Minimum order") ||
      error.message.includes("limit reached") ||
      error.message.includes("Missing")
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create order",
      error: error.message,
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