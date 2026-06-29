const mongoose = require("mongoose");

const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getCartQuery = (req) => {
  const userId = req.params.userId || req.query.user_id || req.body.user_id;
  const sessionId = req.query.session_id || req.body.session_id;

  if (userId) {
    if (!isValidObjectId(userId)) return null;
    return { user_id: userId };
  }

  if (sessionId) return { session_id: sessionId };
  return null;
};

const getCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) return res.status(400).json({ success: false, message: "user_id or session_id is required" });

    const cart = await Cart.findOne(query).select("-__v");
    if (!cart) return res.status(200).json({ success: true, data: { cart: null, items: [], total: 0 } });

    const items = await CartItem.find({ cart_id: cart._id })
      .populate("product_id", "name sku status is_featured average_rating")
      .populate("variant_id", "sku variant_value price sale_price image stock_quantity is_active")
      .select("-__v")
      .sort({ created_at: -1 });

    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    return res.status(200).json({ success: true, data: { cart, items, total } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get cart", error: error.message });
  }
};

const addItemToCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    const { product_id, variant_id, quantity = 1, price: bodyPrice } = req.body;

    if (!query) return res.status(400).json({ success: false, message: "user_id or session_id is required" });
    if (!product_id || !isValidObjectId(product_id)) return res.status(400).json({ success: false, message: "Valid product_id is required" });
    if (variant_id && !isValidObjectId(variant_id)) return res.status(400).json({ success: false, message: "Invalid variant_id" });

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const qty = Number(quantity || 1);
    if (qty < 1) return res.status(400).json({ success: false, message: "quantity must be greater than 0" });

    let price = Number(bodyPrice || 0);
    if (variant_id) {
      const variant = await ProductVariant.findById(variant_id);
      if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });
      if (String(variant.product_id) !== String(product_id)) return res.status(400).json({ success: false, message: "variant_id does not belong to product_id" });
      if (!variant.is_active) return res.status(400).json({ success: false, message: "Variant is inactive" });
      if (variant.stock_quantity < qty) return res.status(400).json({ success: false, message: "Not enough stock" });
      price = variant.sale_price > 0 ? variant.sale_price : variant.price;
    }

    const cart = await Cart.findOneAndUpdate(query, { $setOnInsert: query }, { new: true, upsert: true });

    const item = await CartItem.findOneAndUpdate(
      { cart_id: cart._id, product_id, variant_id: variant_id || null },
      { $inc: { quantity: qty }, $set: { price } },
      { new: true, upsert: true, runValidators: true }
    )
      .populate("product_id", "name sku status")
      .populate("variant_id", "sku variant_value price sale_price image stock_quantity is_active")
      .select("-__v");

    return res.status(200).json({ success: true, message: "Add item to cart successfully", data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to add item to cart", error: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, price } = req.body;

    if (!isValidObjectId(itemId)) return res.status(400).json({ success: false, message: "Invalid cart item id" });
    if (!quantity || Number(quantity) < 1) return res.status(400).json({ success: false, message: "quantity must be greater than 0" });

    const updateData = { quantity: Number(quantity) };
    if (price !== undefined) updateData.price = Number(price);

    const data = await CartItem.findByIdAndUpdate(itemId, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Cart item not found" });
    return res.status(200).json({ success: true, message: "Update cart item successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update cart item", error: error.message });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!isValidObjectId(itemId)) return res.status(400).json({ success: false, message: "Invalid cart item id" });

    const data = await CartItem.findByIdAndDelete(itemId).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Cart item not found" });
    return res.status(200).json({ success: true, message: "Delete cart item successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete cart item", error: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) return res.status(400).json({ success: false, message: "user_id or session_id is required" });

    const cart = await Cart.findOne(query);
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const result = await CartItem.deleteMany({ cart_id: cart._id });
    return res.status(200).json({ success: true, message: "Clear cart successfully", deletedCount: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to clear cart", error: error.message });
  }
};

module.exports = { getCart, addItemToCart, updateCartItem, deleteCartItem, clearCart };
