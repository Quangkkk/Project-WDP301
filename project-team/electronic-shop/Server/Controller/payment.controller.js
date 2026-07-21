const mongoose = require("mongoose");
const paymentService = require("../services/payment.service");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
};

const getCurrentUser = (req) => {
  const currentUser = {
    user_id: req.user_id || null,
    role: req.role || null,
  };

  const guestOrderToken = req.headers?.["x-guest-order-token"];

  if (guestOrderToken) {
    currentUser.guest_order_token = guestOrderToken;
  }

  return currentUser;
};

const getClientBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
};

const getErrorStatus = (error) => {
  const message = String(error?.message || "");
  const normalizedMessage = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (message === "Access denied") {
    return 403;
  }

  if (
    message === "Order not found" ||
    message === "Payment transaction not found" ||
    message ===
      "Bank transfer payment transaction not found"
  ) {
    return 404;
  }

  if (
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("missing zalopay") ||
    normalizedMessage.includes("must be greater than 0") ||
    normalizedMessage.includes("does not match") ||
    normalizedMessage.includes("cancelled") ||
    normalizedMessage.includes("already paid") ||
    normalizedMessage.includes("cannot be paid")
  ) {
    return 400;
  }

  return 500;
};

// ============================================================
// GET PAYMENT BY ORDER
// GET /payment/order/:orderId
// ============================================================

const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required",
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

// ============================================================
// CREATE BANK TRANSFER / VIETQR PAYMENT
// POST /payment/bank-transfer
// ============================================================

const createBankTransferPayment = async (
  req,
  res
) => {
  try {
    const { order_id: orderId } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required",
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

// ============================================================
// CREATE ZALOPAY PAYMENT
// POST /payment/zalopay/create
// ============================================================

const createZaloPayPayment = async (
  req,
  res
) => {
  try {
    const { order_id: orderId } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required",
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
      success: Boolean(result.success),
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

// ============================================================
// ZALOPAY CALLBACK
// POST /payment/zalopay/callback
//
// Route này phải public để ZaloPay có thể gọi vào.
// Service chịu trách nhiệm kiểm tra MAC, app_id và amount.
// ============================================================

const handleZaloPayCallback = async (
  req,
  res
) => {
  try {
    const { data, mac } = req.body;

    if (!data || !mac) {
      return res.status(400).json({
        return_code: 0,
        return_message:
          "data and mac are required",
      });
    }

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
        return_message:
          error.message ||
          "Failed to process ZaloPay callback",
      });
  }
};

// ============================================================
// CONFIRM BANK TRANSFER
// PATCH /payment/order/:orderId/confirm-bank
//
// Route nên có:
// verifyToken
// authorizeRoles("ADMIN", "MANAGER", "STAFF")
// ============================================================

const confirmBankTransferPayment = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required",
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