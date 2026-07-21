const mongoose = require("mongoose");
const cartService = require("../services/cart.service");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || ""));

const normalizeSessionId = (value) => String(value || "").trim();

const getCartQuery = (req) => {
  if (isValidObjectId(req.user_id)) {
    return { user_id: req.user_id };
  }

  const sessionId = normalizeSessionId(
    req.body?.session_id || req.query?.session_id
  );

  if (!/^guest_[A-Za-z0-9_-]{8,120}$/.test(sessionId)) {
    return null;
  }

  return { session_id: sessionId };
};

const resolveQuery = (req, res) => {
  const query = getCartQuery(req);

  if (!query) {
    res.status(400).json({
      success: false,
      message: "Không xác định được phiên giỏ hàng.",
    });
    return null;
  }

  return query;
};

const getErrorStatus = (error) => {
  const message = String(error?.message || "");

  if (
    message === "Khong tim thay san pham" ||
    message === "Khong tim thay phien ban san pham" ||
    message === "Khong tim thay gio hang" ||
    message === "Khong tim thay san pham trong gio hang"
  ) {
    return 404;
  }

  if (
    message === "So luong phai lon hon 0" ||
    message === "Vui long chon phien ban san pham" ||
    message === "Phien ban san pham dang ngung ban" ||
    message === "San pham dang ngung ban" ||
    message === "Khong du hang trong kho"
  ) {
    return 400;
  }

  return 500;
};

const getCart = async (req, res) => {
  try {
    const query = resolveQuery(req, res);
    if (!query) return;

    const data = await cartService.getCart(query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[cart.getCart]", error);
    return res.status(500).json({
      success: false,
      message: "Không tải được giỏ hàng.",
      error: error.message,
    });
  }
};

const addItemToCart = async (req, res) => {
  try {
    const query = resolveQuery(req, res);
    if (!query) return;

    const { product_id, variant_id, quantity = 1 } = req.body;

    if (!isValidObjectId(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    if (!isValidObjectId(variant_id)) {
      return res.status(400).json({
        success: false,
        message: "Mã phiên bản sản phẩm không hợp lệ.",
      });
    }

    const data = await cartService.addItemToCart(query, {
      product_id,
      variant_id,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: "Đã thêm sản phẩm vào giỏ hàng.",
      data,
    });
  } catch (error) {
    console.error("[cart.addItemToCart]", error);
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Không thêm được sản phẩm vào giỏ hàng.",
      error: error.message,
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const query = resolveQuery(req, res);
    if (!query) return;

    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm trong giỏ hàng không hợp lệ.",
      });
    }

    const data = await cartService.updateCartItem(query, itemId, { quantity });

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật giỏ hàng.",
      data,
    });
  } catch (error) {
    console.error("[cart.updateCartItem]", error);
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Không cập nhật được giỏ hàng.",
      error: error.message,
    });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const query = resolveQuery(req, res);
    if (!query) return;

    const { itemId } = req.params;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm trong giỏ hàng không hợp lệ.",
      });
    }

    const data = await cartService.deleteCartItem(query, itemId);

    return res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng.",
      data,
    });
  } catch (error) {
    console.error("[cart.deleteCartItem]", error);
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Không xóa được sản phẩm khỏi giỏ hàng.",
      error: error.message,
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const query = resolveQuery(req, res);
    if (!query) return;

    const result = await cartService.clearCart(query);

    return res.status(200).json({
      success: true,
      message: "Đã xóa toàn bộ giỏ hàng.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("[cart.clearCart]", error);
    return res.status(500).json({
      success: false,
      message: "Không xóa được giỏ hàng.",
      error: error.message,
    });
  }
};

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  deleteCartItem,
  clearCart,
};