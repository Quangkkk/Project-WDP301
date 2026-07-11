const mongoose = require("mongoose");

const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const getCartQuery = (req) => {
  const userId = req.params.userId || req.query.user_id || req.body?.user_id;
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

const collectValidIds = (items, field) => {
  return [
    ...new Set(
      items
        .map((item) => item?.[field])
        .filter((value) => value && isValidObjectId(value))
        .map((value) => String(value))
    ),
  ];
};

const toMapById = (items) => {
  return new Map(items.map((item) => [String(item._id), item]));
};

const loadCartItems = async (cartId) => {
  const rawItems = await CartItem.find({ cart_id: cartId })
    .select("-__v")
    .sort({ created_at: -1 })
    .lean();

  if (rawItems.length === 0) return [];

  const productIds = collectValidIds(rawItems, "product_id");
  const variantIds = collectValidIds(rawItems, "variant_id");

  const [products, variants] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select("name sku status is_featured average_rating")
      .lean(),

    ProductVariant.find({ _id: { $in: variantIds } })
      .select("sku variant_value price sale_price image stock_quantity is_active")
      .lean(),
  ]);

  const productMap = toMapById(products);
  const variantMap = toMapById(variants);

  return rawItems.map((item) => ({
    ...item,
    product_id: productMap.get(String(item.product_id)) || item.product_id,
    variant_id: item.variant_id
      ? variantMap.get(String(item.variant_id)) || item.variant_id
      : null,
  }));
};

const getCart = async (req, res) => {
  try {
    const query = getCartQuery(req);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "user_id hoặc session_id không hợp lệ",
      });
    }

    const cart = await Cart.findOne(query).select("-__v").lean();

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          cart: null,
          items: [],
          total: 0,
        },
      });
    }

    const items = await loadCartItems(cart._id);

    const total = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        cart,
        items,
        total,
      },
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

const addItemToCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    const { product_id, variant_id, quantity = 1, price: bodyPrice } = req.body;

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

    const qty = Number(quantity || 1);

    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0",
      });
    }

    const product = await Product.findById(product_id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    let price = Number(bodyPrice || 0);
    let variantObjectId = null;

    const cart = await Cart.findOneAndUpdate(
      query,
      { $setOnInsert: query },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    if (variant_id) {
      const variant = await ProductVariant.findById(variant_id).lean();

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phiên bản sản phẩm",
        });
      }

      if (String(variant.product_id) !== String(product_id)) {
        return res.status(400).json({
          success: false,
          message: "Phiên bản không thuộc sản phẩm này",
        });
      }

      if (!variant.is_active) {
        return res.status(400).json({
          success: false,
          message: "Phiên bản sản phẩm đang ngừng bán",
        });
      }

      const existingItem = await CartItem.findOne({
        cart_id: cart._id,
        product_id,
        variant_id,
      }).lean();

      const nextQuantity = Number(existingItem?.quantity || 0) + qty;

      if (Number(variant.stock_quantity || 0) < nextQuantity) {
        return res.status(400).json({
          success: false,
          message: "Không đủ hàng trong kho",
        });
      }

      price = Number(variant.sale_price || 0) > 0 ? variant.sale_price : variant.price;
      variantObjectId = variant_id;
    }

    const item = await CartItem.findOneAndUpdate(
      {
        cart_id: cart._id,
        product_id,
        variant_id: variantObjectId,
      },
      {
        $inc: { quantity: qty },
        $set: { price },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).select("-__v");

    return res.status(200).json({
      success: true,
      message: "Đã thêm sản phẩm vào giỏ hàng",
      data: item,
    });
  } catch (error) {
    console.error("[cart.addItemToCart]", error);

    return res.status(500).json({
      success: false,
      message: "Không thêm được sản phẩm vào giỏ hàng",
      error: error.message,
    });
  }
};

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

    const qty = Number(quantity || 0);

    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0",
      });
    }

    const currentItem = await CartItem.findById(itemId).lean();

    if (!currentItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng",
      });
    }

    if (currentItem.variant_id) {
      const variant = await ProductVariant.findById(currentItem.variant_id).lean();

      if (variant && Number(variant.stock_quantity || 0) < qty) {
        return res.status(400).json({
          success: false,
          message: "Không đủ hàng trong kho",
        });
      }
    }

    const updateData = {
      quantity: qty,
    };

    if (price !== undefined) {
      updateData.price = Number(price);
    }

    const data = await CartItem.findByIdAndUpdate(itemId, updateData, {
      new: true,
      runValidators: true,
    }).select("-__v");

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật giỏ hàng",
      data,
    });
  } catch (error) {
    console.error("[cart.updateCartItem]", error);

    return res.status(500).json({
      success: false,
      message: "Không cập nhật được giỏ hàng",
      error: error.message,
    });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "cart item id không hợp lệ",
      });
    }

    const data = await CartItem.findByIdAndDelete(itemId).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
      data,
    });
  } catch (error) {
    console.error("[cart.deleteCartItem]", error);

    return res.status(500).json({
      success: false,
      message: "Không xóa được sản phẩm khỏi giỏ hàng",
      error: error.message,
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const query = getCartQuery(req);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "user_id hoặc session_id không hợp lệ",
      });
    }

    const cart = await Cart.findOne(query).lean();

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Giỏ hàng đã trống",
        deletedCount: 0,
      });
    }

    const result = await CartItem.deleteMany({
      cart_id: cart._id,
    });

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