const crypto = require("crypto");
const mongoose = require("mongoose");

const Order = require("../models/Orders.model");
const PaymentTransaction = require("../models/PaymentTransaction.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getClientBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
};

const getServerBaseUrl = () => {
  return (
    process.env.SERVER_URL ||
    process.env.API_URL ||
    `http://localhost:${process.env.PORT || 8080}`
  ).replace(/\/$/, "");
};

const isLocalServerUrl = (url = "") => {
  return /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
};

const getZaloPayCallbackUrl = () => {
  const callbackUrl = `${getServerBaseUrl()}/payment/zalopay/callback`;

  if (isLocalServerUrl(callbackUrl)) {
    return "";
  }

  return callbackUrl;
};

const toSafeAmount = (amount) => {
  return Math.max(Math.round(Number(amount || 0)), 0);
};

const getShortOrderCode = (orderId) => {
  return `DH${String(orderId).slice(-8).toUpperCase()}`;
};

const getVietnamDatePrefix = () => {
  const now = new Date();
  const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = String(vietnamTime.getUTCFullYear()).slice(-2);
  const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vietnamTime.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

const buildVietQrUrl = ({ amount, transferContent }) => {
  const bankId = process.env.BANK_TRANSFER_BANK_ID || "MB";
  const accountNo = process.env.BANK_TRANSFER_ACCOUNT_NO || "123456789";
  const accountName =
    process.env.BANK_TRANSFER_ACCOUNT_NAME || "ONLINE TECH SHOP";
  const template = process.env.BANK_TRANSFER_TEMPLATE || "compact2";

  const encodedContent = encodeURIComponent(transferContent);
  const encodedName = encodeURIComponent(accountName);

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
};

const getOrderOrResponse = async (orderId, res) => {
  if (!orderId || !isValidObjectId(orderId)) {
    res.status(400).json({
      success: false,
      message: "Valid order_id is required",
    });
    return null;
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404).json({
      success: false,
      message: "Order not found",
    });
    return null;
  }

  return order;
};

const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order_id is required",
      });
    }

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const payment = await PaymentTransaction.findOne({
      order_id: orderId,
    })
      .sort({
        updated_at: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        order,
        payment,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get payment information",
      error: error.message,
    });
  }
};

const createBankTransferPayment = async (req, res) => {
  try {
    const { order_id } = req.body;
    const order = await getOrderOrResponse(order_id, res);

    if (!order) return;

    const amount = toSafeAmount(order.total_amount);
    const transferContent = getShortOrderCode(order._id);
    const qrUrl = buildVietQrUrl({
      amount,
      transferContent,
    });

    const payment = await PaymentTransaction.findOneAndUpdate(
      {
        order_id: order._id,
        provider: "bank_transfer",
      },
      {
        order_id: order._id,
        provider: "bank_transfer",
        amount,
        status: order.payment_status === "paid" ? "paid" : "pending",
        payment_code: transferContent,
        transaction_ref: transferContent,
        qr_url: qrUrl,
        bank_code: process.env.BANK_TRANSFER_BANK_ID || "MB",
        account_no: process.env.BANK_TRANSFER_ACCOUNT_NO || "123456789",
        account_name:
          process.env.BANK_TRANSFER_ACCOUNT_NAME || "ONLINE TECH SHOP",
        transfer_content: transferContent,
        raw_response: {
          source: "vietqr_quick_link",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    order.payment_method = "bank_transfer";

    if (order.payment_status !== "paid") {
      order.payment_status = "pending";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Create bank transfer payment successfully",
      data: {
        order,
        payment,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create bank transfer payment",
      error: error.message,
    });
  }
};

const createZaloPayPayment = async (req, res) => {
  try {
    const { order_id } = req.body;
    const order = await getOrderOrResponse(order_id, res);

    if (!order) return;

    const appId = process.env.ZALOPAY_APP_ID;
    const key1 = process.env.ZALOPAY_KEY1;
    const endpoint =
      process.env.ZALOPAY_ENDPOINT ||
      "https://sb-openapi.zalopay.vn/v2/create";

    if (!appId || !key1) {
      return res.status(400).json({
        success: false,
        message: "Missing ZALOPAY_APP_ID or ZALOPAY_KEY1 in Server/.env",
      });
    }

    const amount = toSafeAmount(order.total_amount);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order amount must be greater than 0 for ZaloPay payment",
      });
    }

    const appTransId = `${getVietnamDatePrefix()}_${String(order._id).slice(
      -12
    )}`;

    const appTime = Date.now();
    const redirectUrl = `${getClientBaseUrl()}/payment-result/${order._id}?provider=zalopay`;

    const embedData = JSON.stringify({
      redirecturl: redirectUrl,
      order_id: String(order._id),
      preferred_payment_method: [],
    });

    const item = JSON.stringify([
      {
        itemid: String(order._id),
        itemname: `Order ${getShortOrderCode(order._id)}`,
        itemprice: amount,
        itemquantity: 1,
      },
    ]);

    const zaloOrder = {
      app_id: Number(appId),
      app_user: String(order.user_id).slice(0, 50),
      app_trans_id: appTransId,
      app_time: appTime,
      amount,
      item,
      embed_data: embedData,
      description: `Thanh toan don hang ${getShortOrderCode(order._id)}`,
      bank_code: "",
    };

    const callbackUrl = getZaloPayCallbackUrl();

    if (callbackUrl) {
      zaloOrder.callback_url = callbackUrl;
    }

    const hmacInput = [
      zaloOrder.app_id,
      zaloOrder.app_trans_id,
      zaloOrder.app_user,
      zaloOrder.amount,
      zaloOrder.app_time,
      zaloOrder.embed_data,
      zaloOrder.item,
    ].join("|");

    zaloOrder.mac = crypto
      .createHmac("sha256", key1)
      .update(hmacInput)
      .digest("hex");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zaloOrder),
    });

    const zaloResult = await response.json();

    const isSuccess =
      zaloResult.return_code === 1 || zaloResult.returncode === 1;

    const paymentUrl = zaloResult.order_url || zaloResult.orderurl || null;
    const qrUrl = zaloResult.qr_code || null;

    const payment = await PaymentTransaction.findOneAndUpdate(
      {
        order_id: order._id,
        provider: "zalopay",
      },
      {
        order_id: order._id,
        provider: "zalopay",
        amount,
        status: isSuccess ? "pending" : "failed",
        payment_code: appTransId,
        transaction_ref: appTransId,
        provider_order_id: appTransId,
        payment_url: paymentUrl,
        qr_url: qrUrl,
        raw_response: {
          request: {
            ...zaloOrder,
            mac: "[hidden]",
          },
          response: zaloResult,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    order.payment_method = "zalopay";
    order.payment_status = isSuccess ? "pending" : "failed";
    await order.save();

    return res.status(200).json({
      success: isSuccess,
      message: isSuccess
        ? "Create ZaloPay payment successfully"
        : zaloResult.return_message ||
          zaloResult.returnmessage ||
          zaloResult.sub_return_message ||
          "ZaloPay create order failed",
      data: {
        order,
        payment,
        payment_url: paymentUrl,
        order_url: paymentUrl,
        qr_url: qrUrl,
        zalopay: zaloResult,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create ZaloPay payment",
      error: error.message,
    });
  }
};

const handleZaloPayCallback = async (req, res) => {
  try {
    const { data, mac } = req.body;
    const key2 = process.env.ZALOPAY_KEY2;

    if (!key2) {
      return res.status(400).json({
        return_code: -1,
        return_message: "Missing ZALOPAY_KEY2",
      });
    }

    const requestMac = crypto
      .createHmac("sha256", key2)
      .update(data)
      .digest("hex");

    if (requestMac !== mac) {
      return res.status(400).json({
        return_code: -1,
        return_message: "Invalid MAC",
      });
    }

    const callbackData = JSON.parse(data);
    const appTransId = callbackData.app_trans_id || callbackData.apptransid;
    const zpTransId = callbackData.zp_trans_id || callbackData.zptransid;

    const payment = await PaymentTransaction.findOne({
      provider: "zalopay",
      transaction_ref: appTransId,
    });

    if (!payment) {
      return res.status(404).json({
        return_code: -1,
        return_message: "Payment transaction not found",
      });
    }

    payment.status = "paid";
    payment.paid_at = new Date();
    payment.provider_order_id = zpTransId
      ? String(zpTransId)
      : payment.provider_order_id;
    payment.raw_response = callbackData;

    await payment.save();

    await Order.findByIdAndUpdate(payment.order_id, {
      payment_method: "zalopay",
      payment_status: "paid",
    });

    return res.status(200).json({
      return_code: 1,
      return_message: "success",
    });
  } catch (error) {
    return res.status(500).json({
      return_code: 0,
      return_message: error.message,
    });
  }
};

const confirmBankTransferPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderOrResponse(orderId, res);

    if (!order) return;

    const payment = await PaymentTransaction.findOneAndUpdate(
      {
        order_id: order._id,
        provider: "bank_transfer",
      },
      {
        status: "paid",
        paid_at: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Bank transfer payment transaction not found",
      });
    }

    order.payment_method = "bank_transfer";
    order.payment_status = "paid";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Confirm bank transfer payment successfully",
      data: {
        order,
        payment,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to confirm bank transfer payment",
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