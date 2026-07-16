const mongoose = require("mongoose");
const paymentService = require("../services/payment.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getClientBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
};

// Controller lay thong tin thanh toan
const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Valid order_id is required" });
    }

    const data = await paymentService.getPaymentByOrder(orderId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to get payment", error: error.message });
  }
};

// Controller khoi tao thanh toan VietQR
const createBankTransferPayment = async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id || !isValidObjectId(order_id)) {
      return res.status(400).json({ success: false, message: "Valid order_id is required" });
    }

    const result = await paymentService.createBankTransferPayment(order_id);
    return res.status(200).json({
      success: true,
      message: "Create bank transfer payment successfully",
      data: result,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to create payment", error: error.message });
  }
};

// Controller khoi tao thanh toan ZaloPay
const createZaloPayPayment = async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id || !isValidObjectId(order_id)) {
      return res.status(400).json({ success: false, message: "Valid order_id is required" });
    }

    const clientBaseUrl = getClientBaseUrl();
    const result = await paymentService.createZaloPayPayment(order_id, { clientBaseUrl });

    return res.status(200).json({
      success: result.success,
      message: result.success ? "Create ZaloPay payment successfully" : "ZaloPay payment initialization failed",
      data: result,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Order not found") {
      statusCode = 404;
    } else if (error.message.includes("Missing ZALOPAY_APP_ID") || error.message.includes("must be greater than 0")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to create payment", error: error.message });
  }
};

// Controller callback/webhook ZaloPay tu dong goi tu API ben ngoai
const handleZaloPayCallback = async (req, res) => {
  try {
    const { data, mac } = req.body;
    const result = await paymentService.handleZaloPayCallback({ data, mac });
    return res.status(200).json(result);
  } catch (error) {
    console.error("[payment.handleZaloPayCallback]", error);
    let statusCode = 500;
    if (error.message === "Invalid MAC" || error.message === "Missing ZALOPAY_KEY2") {
      statusCode = 400;
    } else if (error.message === "Payment transaction not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      return_code: 0,
      return_message: error.message,
    });
  }
};

// Controller confirm thanh toan MB Bank thu cong (ADMIN/STAFF)
const confirmBankTransferPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Valid order_id is required" });
    }

    const result = await paymentService.confirmBankTransferPayment(orderId);
    return res.status(200).json({
      success: true,
      message: "Confirm bank transfer payment successfully",
      data: result,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Order not found" || error.message === "Bank transfer payment transaction not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to confirm payment", error: error.message });
  }
};

module.exports = {
  getPaymentByOrder,
  createBankTransferPayment,
  createZaloPayPayment,
  handleZaloPayCallback,
  confirmBankTransferPayment,
};