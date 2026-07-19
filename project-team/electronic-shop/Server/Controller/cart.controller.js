const mongoose = require("mongoose");
const cartService = require("../services/cart.service");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || ""));

const getCartQuery = (req) => {
  const userId = req.user_id;

  if (!isValidObjectId(userId)) {
    return null;
  }

  if (
    req.params.userId &&
    String(req.params.userId) !== String(userId)
  ) {
    return "FORBIDDEN";
  }

  return { user_id: userId };
};

const getErrorStatus = (error) => {
  if (
    error.message === "Khong tim thay san pham" ||
    error.message === "Khong tim thay phien ban san pham" ||
    error.message === "Khong tim thay gio hang" ||
    error.message === "Khong tim thay san pham trong gio hang"
  ) {
    return 404;
  }

  if (
    error.message === "So luong phai lon hon 0" ||
    error.message === "Vui long chon phien ban san pham" ||
    error.message === "Phien ban san pham dang ngung ban" ||
    error.message === "San pham dang ngung ban" ||
    error.message === "Khong du hang trong kho"
  ) {
    return 400;
  }

  return 500;
};

const resolveQuery = (req, res) => {
  const query = getCartQuery(req);

  if (query === "FORBIDDEN") {
    res.status(403).json({
      success: false,
      message: "Ban khong co quyen truy cap gio hang cua nguoi khac",
    });
    return null;
  }

  if (!query) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
    return null;
  }

  return query;
};

const getCart = async (req, res) => {
  try {
    const query = resolveQuery(req, res);
    if (!query) return;

    const data = await cartService.getCart(query);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[cart.getCart]", error);
    return res.status(500).json({
      success: false,
      message: "Khong tai duoc gio hang",
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
        message: "product_id khong hop le",
      });
    }

    if (!isValidObjectId(variant_id)) {
      return res.status(400).json({
        success: false,
        message: "variant_id khong hop le",
      });
    }

    const item = await cartService.addItemToCart(query, {
      product_id,
      variant_id,
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: "Da them san pham vao gio hang",
      data: item,
    });
  } catch (error) {
    console.error("[cart.addItemToCart]", error);
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Khong them duoc san pham vao gio hang",
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
        message: "cart item id khong hop le",
      });
    }

    const data = await cartService.updateCartItem(query, itemId, {
      quantity,
    });

    return res.status(200).json({
      success: true,
      message: "Da cap nhat gio hang",
      data,
    });
  } catch (error) {
    console.error("[cart.updateCartItem]", error);
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Khong cap nhat duoc gio hang",
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
        message: "cart item id khong hop le",
      });
    }

    const data = await cartService.deleteCartItem(query, itemId);

    return res.status(200).json({
      success: true,
      message: "Da xoa san pham khoi gio hang",
      data,
    });
  } catch (error) {
    console.error("[cart.deleteCartItem]", error);
    return res.status(getErrorStatus(error)).json({
      success: false,
      message: error.message || "Khong xoa duoc san pham khoi gio hang",
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
      message: "Da xoa toan bo gio hang",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("[cart.clearCart]", error);
    return res.status(500).json({
      success: false,
      message: "Khong xoa duoc gio hang",
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
