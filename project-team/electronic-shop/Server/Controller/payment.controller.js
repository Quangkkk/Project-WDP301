const mongoose = require("mongoose");
const paymentService = require(
  "../services/payment.service"
);

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(
    String(id || "")
  );

const getCurrentUser = (req) => ({
  user_id: req.user_id,
  role: req.role,
});

const getClientBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
};

const getErrorStatus = (error) => {
  if (error.message === "Unauthorized") {
    return 401;
  }

  if (error.message === "Access denied") {
    return 403;
  }

  if (
    error.message === "Order not found" ||
    error.message ===
      "Payment transaction not found" ||
    error.message ===
      "Bank transfer payment transaction not found"
  ) {
    return 404;
  }

  if (
    error.message.includes(
      "Missing ZALOPAY"
    ) ||
    error.message.includes(
      "must be greater than 0"
    ) ||
    error.message.includes(
      "does not match"
    ) ||
    error.message.includes("required") ||
    error.message === "Invalid MAC" ||
    error.message === "Invalid app_id"
  ) {
    return 400;
  }

  return 500;
};

// Lay payment cua don hang
const getPaymentByOrder = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid order_id is required",
      });
    }

    const data =
      await paymentService.getPaymentByOrder(
        orderId,
        getCurrentUser(req)
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to get payment",
        error: error.message,
      });
  }
};

// Tao VietQR
const createBankTransferPayment = async (
  req,
  res
) => {
  try {
    const {
      order_id: orderId,
    } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid order_id is required",
      });
    }

    const result =
      await paymentService.createBankTransferPayment(
        orderId,
        getCurrentUser(req)
      );

    return res.status(200).json({
      success: true,
      message:
        "Create bank transfer payment successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to create payment",
        error: error.message,
      });
  }
};

// Tao ZaloPay payment
const createZaloPayPayment = async (
  req,
  res
) => {
  try {
    const {
      order_id: orderId,
    } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid order_id is required",
      });
    }

    const result =
      await paymentService.createZaloPayPayment(
        orderId,
        {
          clientBaseUrl:
            getClientBaseUrl(),
          currentUser:
            getCurrentUser(req),
        }
      );

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? "Create ZaloPay payment successfully"
        : "ZaloPay payment initialization failed",
      data: result,
    });
  } catch (error) {
    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to create payment",
        error: error.message,
      });
  }
};

// Callback public tu ZaloPay
const handleZaloPayCallback = async (
  req,
  res
) => {
  try {
    const { data, mac } = req.body;

    const result =
      await paymentService.handleZaloPayCallback(
        {
          data,
          mac,
        }
      );

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "[payment.handleZaloPayCallback]",
      error
    );

    return res
      .status(getErrorStatus(error))
      .json({
        return_code: 0,
        return_message: error.message,
      });
  }
};

// Admin/Manager/Staff confirm chuyen khoan
const confirmBankTransferPayment = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid order_id is required",
      });
    }

    const result =
      await paymentService.confirmBankTransferPayment(
        orderId,
        getCurrentUser(req)
      );

    return res.status(200).json({
      success: true,
      message:
        "Confirm bank transfer payment successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(getErrorStatus(error))
      .json({
        success: false,
        message:
          error.message ||
          "Failed to confirm payment",
        error: error.message,
      });
  }
};

module.exports = {
  getPaymentByOrder,
  createBankTransferPayment,
  createZaloPayPayment,
  handleZaloPayCallback,
  confirmBankTransferPayment,
};