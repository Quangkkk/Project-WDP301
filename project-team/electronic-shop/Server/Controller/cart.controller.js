const mongoose = require("mongoose");
const cartService = require("../services/cart.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const getCartQuery = (req) => {
  // uu tien lay user_id cua nguoi dung da dang nhap tu token truoc
  const userId = req.user_id || req.params.userId || req.query.user_id || req.body?.user_id;
  const sessionId = req.query.session_id || req.body?.session_id;

  if (userId) {
    if (!isValidObjectId(userId)) return null;
    return { user_id: userId };
  }

  if (sessionId) {
    return { session_id: String(sessionId) };
  }

  return null;
};

// Controller lay gio hang
const getCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "user_id hoặc session_id không hợp lệ",
      });
    }

    const data = await cartService.getCart(query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[cart.getCart]", error);
    return res.status(500).json({
      success: false,
      message: "Không tải được giỏ hàng",
      error: error.message,
    });
  }
};

// Controller them san pham vao gio
const addItemToCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    const { product_id, variant_id, quantity = 1, price } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "user_id hoặc session_id không hợp lệ",
      });
    }

    if (!product_id || !isValidObjectId(product_id)) {
      return res.status(400).json({
        success: false,
        message: "product_id không hợp lệ",
      });
    }

    if (variant_id && !isValidObjectId(variant_id)) {
      return res.status(400).json({
        success: false,
        message: "variant_id không hợp lệ",
      });
    }

    const item = await cartService.addItemToCart(query, {
      product_id,
      variant_id,
      quantity,
      price,
    });

    return res.status(200).json({
      success: true,
      message: "Đã thêm sản phẩm vào giỏ hàng",
      data: item,
    });
  } catch (error) {
    console.error("[cart.addItemToCart]", error);
    let statusCode = 500;
    if (
      error.message === "Khong tim thay san pham" ||
      error.message === "Khong tim thay phien ban san pham"
    ) {
      statusCode = 404;
    } else if (
      error.message === "So luong phai lon hon 0" ||
      error.message === "Phien ban khong thuoc san pham nay" ||
      error.message === "Phien ban san pham dang ngung ban" ||
      error.message === "Khong du hang trong kho"
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không thêm được sản phẩm vào giỏ hàng",
      error: error.message,
    });
  }
};

// Controller cap nhat gio hang
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, price } = req.body;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "cart item id không hợp lệ",
      });
    }

    const data = await cartService.updateCartItem(itemId, { quantity, price });

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật giỏ hàng",
      data,
    });
  } catch (error) {
    console.error("[cart.updateCartItem]", error);
    let statusCode = 500;
    if (error.message === "Khong tim thay san pham trong giot hang") {
      statusCode = 404;
    } else if (
      error.message === "So luong phai lon hon 0" ||
      error.message === "Khong du hang trong kho"
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không cập nhật được giỏ hàng",
      error: error.message,
    });
  }
};

// Controller xoa mat hang khoi gio
const deleteCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "cart item id không hợp lệ",
      });
    }

    const data = await cartService.deleteCartItem(itemId);

    return res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
      data,
    });
  } catch (error) {
    console.error("[cart.deleteCartItem]", error);
    let statusCode = 500;
    if (error.message === "Khong tim thay san pham trong giot hang") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Không xóa được sản phẩm khỏi giỏ hàng",
      error: error.message,
    });
  }
};

// Controller xoa sach gio
const clearCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "user_id hoặc session_id không hợp lệ",
      });
    }

    const result = await cartService.clearCart(query);

    return res.status(200).json({
      success: true,
      message: "Đã xóa toàn bộ giỏ hàng",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("[cart.clearCart]", error);
    return res.status(500).json({
      success: false,
      message: "Không xóa được giỏ hàng",
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