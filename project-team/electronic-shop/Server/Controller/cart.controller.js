const mongoose = require("mongoose");

const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getCartQuery = (req) => {
  const user_id = req.params.userId || req.body.user_id || req.query.user_id;
  const session_id = req.body.session_id || req.query.session_id;
  if (user_id) return { user_id };
  if (session_id) return { session_id };
  return null;
};

const getOrCreateCart = async (query) => {
  let cart = await Cart.findOne(query);
  if (!cart) cart = await Cart.create(query);
  return cart;
};

const getCart = async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) return res.status(400).json({ success: false, message: "user_id or session_id is required" });

    const cart = await getOrCreateCart(query);
    const items = await CartItem.find({ cart_id: cart._id })
      .populate("product_id", "name sku images price sale_price status")
      .populate("variant_id", "sku variant_name color storage ram images price sale_price stock_quantity status")
      .select("-__v")
      .sort({ createdAt: -1 });

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return res.status(200).json({ success: true, data: { cart, items, total } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get cart", error: error.message });
  }
};

const addItemToCart = async (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    const query = getCartQuery(req);

    if (!query) return res.status(400).json({ success: false, message: "user_id or session_id is required" });
    if (!product_id || !isValidObjectId(product_id)) return res.status(400).json({ success: false, message: "Valid product_id is required" });
    if (variant_id && !isValidObjectId(variant_id)) return res.status(400).json({ success: false, message: "Invalid variant_id" });

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    let price = product.sale_price > 0 ? product.sale_price : product.price;
    let variant = null;
    if (variant_id) {
      variant = await ProductVariant.findById(variant_id);
      if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });
      if (String(variant.product_id) !== String(product_id)) {
        return res.status(400).json({ success: false, message: "variant_id does not belong to product_id" });
      }
      if (variant.stock_quantity < quantity) return res.status(400).json({ success: false, message: "Not enough stock" });
      price = variant.sale_price > 0 ? variant.sale_price : variant.price;
    }

    const cart = await getOrCreateCart(query);
    let item = await CartItem.findOne({ cart_id: cart._id, product_id, variant_id: variant_id || null });
    if (item) {
      item.quantity += Number(quantity);
      item.price = price;
      await item.save();
    } else {
      item = await CartItem.create({ cart_id: cart._id, product_id, variant_id: variant_id || null, quantity, price });
    }

    await Product.findByIdAndUpdate(product_id, { $inc: { total_cart_addition: 1 } });
    return res.status(200).json({ success: true, message: "Add item to cart successfully", data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to add item to cart", error: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    if (!isValidObjectId(itemId)) return res.status(400).json({ success: false, message: "Invalid cart item id" });
    if (!quantity || quantity < 1) return res.status(400).json({ success: false, message: "quantity must be greater than 0" });

    const data = await CartItem.findByIdAndUpdate(itemId, { quantity }, { new: true, runValidators: true }).select("-__v");
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
    await CartItem.deleteMany({ cart_id: cart._id });
    return res.status(200).json({ success: true, message: "Clear cart successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to clear cart", error: error.message });
  }
};

module.exports = { getCart, addItemToCart, updateCartItem, deleteCartItem, clearCart };