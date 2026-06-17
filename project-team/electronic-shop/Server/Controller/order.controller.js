const mongoose = require("mongoose");

const Order = require("../models/Orders.model");
const OrderItem = require("../models/OrderItem.model");
const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const ShippingMethod = require("../models/ShippingMethod.model");
const Coupon = require("../models/Coupon.model");
const CouponUsage = require("../models/CouponUsage.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const calculateDiscount = async (couponCode, userId, subtotal) => {
  if (!couponCode) return { coupon: null, discountAmount: 0 };

  const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), status: "active" });
  if (!coupon) throw new Error("Coupon not found or inactive");

  const now = new Date();
  if (coupon.starts_at && coupon.starts_at > now) throw new Error("Coupon has not started yet");
  if (coupon.expired_at && coupon.expired_at < now) throw new Error("Coupon has expired");
  if (subtotal < coupon.min_order_amount) throw new Error(`Minimum order amount is ${coupon.min_order_amount}`);

  const totalUsed = await CouponUsage.aggregate([
    { $match: { coupon_id: coupon._id } },
    { $group: { _id: null, total: { $sum: "$used_count" } } },
  ]);
  if (coupon.usage_limit !== null && totalUsed[0]?.total >= coupon.usage_limit) throw new Error("Coupon usage limit reached");

  if (coupon.usage_limit_per_user !== null) {
    const userUsed = await CouponUsage.aggregate([
      { $match: { coupon_id: coupon._id, user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$used_count" } } },
    ]);
    if (userUsed[0]?.total >= coupon.usage_limit_per_user) throw new Error("User coupon usage limit reached");
  }

  let discountAmount = coupon.discount_type === "percent" ? (subtotal * coupon.discount_value) / 100 : coupon.discount_value;
  if (coupon.max_discount !== null) discountAmount = Math.min(discountAmount, coupon.max_discount);
  discountAmount = Math.min(discountAmount, subtotal);

  return { coupon, discountAmount };
};

const getItemsFromRequestOrCart = async ({ items, cart_id, user_id }) => {
  if (Array.isArray(items) && items.length > 0) return items;

  if (cart_id) {
    if (!isValidObjectId(cart_id)) throw new Error("Invalid cart_id");
    const cartItems = await CartItem.find({ cart_id }).lean();
    if (cartItems.length === 0) throw new Error("Cart is empty");
    return cartItems.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));
  }

  if (user_id) {
    const cart = await Cart.findOne({ user_id });
    if (cart) {
      const cartItems = await CartItem.find({ cart_id: cart._id }).lean();
      if (cartItems.length > 0) {
        return cartItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        }));
      }
    }
  }

  throw new Error("items or cart_id is required");
};

const buildOrderItems = async (items) => {
  const orderItems = [];
  let subtotal = 0;

  for (const rawItem of items) {
    const product_id = rawItem.product_id;
    const variant_id = rawItem.variant_id || null;
    const quantity = Number(rawItem.quantity || 1);

    if (!isValidObjectId(product_id)) throw new Error("Invalid product_id in items");
    if (variant_id && !isValidObjectId(variant_id)) throw new Error("Invalid variant_id in items");
    if (quantity < 1) throw new Error("Item quantity must be greater than 0");

    const product = await Product.findById(product_id);
    if (!product) throw new Error("Product not found");

    let unitPrice = product.sale_price > 0 ? product.sale_price : product.price;

    if (variant_id) {
      const variant = await ProductVariant.findById(variant_id);
      if (!variant) throw new Error("Variant not found");
      if (String(variant.product_id) !== String(product_id)) throw new Error("variant_id does not belong to product_id");
      if (variant.stock_quantity < quantity) throw new Error(`Not enough stock for ${variant.sku}`);
      unitPrice = variant.sale_price > 0 ? variant.sale_price : variant.price;
    }

    const subTotal = unitPrice * quantity;
    subtotal += subTotal;
    orderItems.push({ product_id, variant_id, quantity, unit_price: unitPrice, sub_total: subTotal });
  }

  return { orderItems, subtotal };
};

const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      shipping_method_id,
      payment_method = "cod",
      receiver_name,
      receiver_phone,
      shipping_province,
      shipping_ward,
      shipping_district,
      shipping_address_line,
      note,
      items,
      cart_id,
      coupon_code,
    } = req.body;

    if (!user_id || !isValidObjectId(user_id)) return res.status(400).json({ success: false, message: "Valid user_id is required" });
    if (!receiver_name || !receiver_phone || !shipping_province || !shipping_ward || !shipping_district || !shipping_address_line) {
      return res.status(400).json({ success: false, message: "Missing shipping receiver information" });
    }

    let shippingFee = 0;
    if (shipping_method_id) {
      if (!isValidObjectId(shipping_method_id)) return res.status(400).json({ success: false, message: "Invalid shipping_method_id" });
      const shippingMethod = await ShippingMethod.findById(shipping_method_id);
      if (!shippingMethod) return res.status(404).json({ success: false, message: "Shipping method not found" });
      shippingFee = shippingMethod.base_fee;
    }

    const finalItems = await getItemsFromRequestOrCart({ items, cart_id, user_id });
    const { orderItems, subtotal } = await buildOrderItems(finalItems);
    const { coupon, discountAmount } = await calculateDiscount(coupon_code, user_id, subtotal);
    const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

    const order = await Order.create({
      user_id,
      shipping_method_id: shipping_method_id || null,
      payment_method,
      payment_status: payment_method === "cod" ? "unpaid" : "pending",
      shipping_fee: shippingFee,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      receiver_name,
      receiver_phone,
      shipping_province,
      shipping_ward,
      shipping_district,
      shipping_address_line,
      note: note || null,
    });

    const createdItems = await OrderItem.insertMany(orderItems.map((item) => ({ ...item, order_id: order._id })));

    for (const item of orderItems) {
      if (item.variant_id) {
        await ProductVariant.findByIdAndUpdate(item.variant_id, { $inc: { stock_quantity: -item.quantity } });
      }
    }

    if (coupon) await CouponUsage.create({ coupon_id: coupon._id, user_id, order_id: order._id, used_count: 1 });

    if (cart_id) await CartItem.deleteMany({ cart_id });

    return res.status(201).json({
      success: true,
      message: "Create order successfully",
      data: { order, items: createdItems, subtotal, discount_amount: discountAmount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { user_id, status, payment_status } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;

    const orders = await Order.find(filter)
      .populate("user_id", "name email phone")
      .populate("shipping_method_id", "name base_fee estimate_days")
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    const orderIds = orders.map((order) => order._id);
    const items = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate("product_id", "name sku images")
      .populate("variant_id", "sku variant_name color storage ram images")
      .select("-__v")
      .lean();

    const itemsByOrder = items.reduce((map, item) => {
      const key = String(item.order_id);
      if (!map[key]) map[key] = [];
      map[key].push(item);
      return map;
    }, {});

    const data = orders.map((order) => ({ ...order, items: itemsByOrder[String(order._id)] || [] }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get orders", error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const order = await Order.findById(id)
      .populate("user_id", "name email phone")
      .populate("shipping_method_id", "name base_fee estimate_days")
      .select("-__v")
      .lean();

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const items = await OrderItem.find({ order_id: id })
      .populate("product_id", "name sku images")
      .populate("variant_id", "sku variant_name color storage ram images")
      .select("-__v");
    const coupon_usage = await CouponUsage.findOne({ order_id: id }).populate("coupon_id", "code name discount_type discount_value");

    return res.status(200).json({ success: true, data: { order, items, coupon_usage } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get order", error: error.message });
  }
};

const updateOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const allowedFields = ["status", "payment_status", "payment_method", "note", "cancel_reason"];
    const updateData = {};
    for (const field of allowedFields) if (req.body[field] !== undefined) updateData[field] = req.body[field];

    const data = await Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Order not found" });
    return res.status(200).json({ success: true, message: "Update order successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update order", error: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (["completed", "cancelled", "returned"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "This order cannot be cancelled" });
    }

    const items = await OrderItem.find({ order_id: id });
    for (const item of items) {
      if (item.variant_id) await ProductVariant.findByIdAndUpdate(item.variant_id, { $inc: { stock_quantity: item.quantity } });
    }

    order.status = "cancelled";
    order.cancel_reason = cancel_reason || null;
    await order.save();

    return res.status(200).json({ success: true, message: "Cancel order successfully", data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to cancel order", error: error.message });
  }
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderById, cancelOrder };