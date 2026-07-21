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

const ORDER_STATUS = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
  "cancelled",
];

const PAYMENT_STATUS = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeCouponCode = (code) => {
  return code ? String(code).trim().toUpperCase() : null;
};

const calculateDiscount = async (couponCode, userId, subtotal) => {
  const code = normalizeCouponCode(couponCode);

  if (!code) {
    return {
      coupon: null,
      discountAmount: 0,
    };
  }

  const coupon = await Coupon.findOne({ code });

  if (!coupon) {
    throw new Error("Coupon not found");
  }

  const now = new Date();

  if (coupon.start_at && coupon.start_at > now) {
    throw new Error("Coupon has not started yet");
  }

  if (coupon.expired_at && coupon.expired_at < now) {
    throw new Error("Coupon has expired");
  }

  if (subtotal < Number(coupon.min_order_amount || 0)) {
    throw new Error(`Minimum order amount is ${coupon.min_order_amount}`);
  }

  const totalUsed = await CouponUsage.aggregate([
    {
      $match: {
        coupon_id: coupon._id,
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$used_count",
        },
      },
    },
  ]);

  const currentTotalUsed = totalUsed[0]?.total || 0;

  if (
    coupon.usage_limit !== null &&
    coupon.usage_limit !== undefined &&
    currentTotalUsed >= coupon.usage_limit
  ) {
    throw new Error("Coupon usage limit reached");
  }

  if (
    coupon.usage_limit_per_user !== null &&
    coupon.usage_limit_per_user !== undefined
  ) {
    const usage = await CouponUsage.findOne({
      coupon_id: coupon._id,
      user_id: userId,
    });

    if ((usage?.used_count || 0) >= coupon.usage_limit_per_user) {
      throw new Error("User coupon usage limit reached");
    }
  }

  let discountAmount = 0;

  if (coupon.discount_type === "percent") {
    discountAmount = (subtotal * Number(coupon.discount_value || 0)) / 100;
  } else {
    discountAmount = Number(coupon.discount_value || 0);
  }

  if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
    discountAmount = Math.min(discountAmount, coupon.max_discount);
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    coupon,
    discountAmount,
  };
};

const getItemsFromRequestOrCart = async ({ items, cart_id, user_id }) => {
  if (Array.isArray(items) && items.length > 0) {
    return items;
  }

  if (cart_id) {
    if (!isValidObjectId(cart_id)) {
      throw new Error("Invalid cart_id");
    }

    const cartItems = await CartItem.find({ cart_id }).lean();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    return cartItems.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
    }));
  }

  if (user_id) {
    const cart = await Cart.findOne({ user_id });

    if (cart) {
      const cartItems = await CartItem.find({
        cart_id: cart._id,
      }).lean();

      if (cartItems.length > 0) {
        return cartItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
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

    if (!isValidObjectId(product_id)) {
      throw new Error("Invalid product_id in items");
    }

    if (variant_id && !isValidObjectId(variant_id)) {
      throw new Error("Invalid variant_id in items");
    }

    if (quantity < 1) {
      throw new Error("Item quantity must be greater than 0");
    }

    const product = await Product.findById(product_id);

    if (!product) {
      throw new Error("Product not found");
    }

    let unitPrice = rawItem.price !== undefined ? Number(rawItem.price) : 0;
    let image = rawItem.image || null;

    if (variant_id) {
      const variant = await ProductVariant.findById(variant_id);

      if (!variant) {
        throw new Error("Variant not found");
      }

      if (String(variant.product_id) !== String(product_id)) {
        throw new Error("variant_id does not belong to product_id");
      }

      if (!variant.is_active) {
        throw new Error(`Variant ${variant.sku} is inactive`);
      }

      if (variant.stock_quantity < quantity) {
        throw new Error(`Not enough stock for ${variant.sku}`);
      }

      unitPrice = variant.sale_price > 0 ? variant.sale_price : variant.price;
      image = variant.image || image;
    }

    if (unitPrice < 0) {
      throw new Error("Item price must not be negative");
    }

    const itemSubtotal = unitPrice * quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      product_id,
      variant_id,
      image,
      unit_price: unitPrice,
      quantity,
      subtotal: itemSubtotal,
    });
  }

  return {
    orderItems,
    subtotal,
  };
};

const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      shipping_method_id,
      status,
      payment_method = "cod",
      payment_status,
      receiver_name,
      receiver_phone,
      receiver_email,
      address_province,
      address_ward,
      address_district,
      address_address_line,
      shipping_province,
      shipping_ward,
      shipping_district,
      shipping_address_line,
      items,
      cart_id,
      coupon_code,
    } = req.body;

    const targetUserId = req.user_id || user_id || null;

    if (targetUserId && !isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id",
      });
    }

    if (status && !ORDER_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`,
      });
    }

    if (payment_status && !PAYMENT_STATUS.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(", ")}`,
      });
    }

    const province = address_province || shipping_province;
    const ward = address_ward || shipping_ward;
    const district = address_district || shipping_district;
    const addressLine = address_address_line || shipping_address_line;

    if (
      !receiver_name ||
      !receiver_phone ||
      !province ||
      !ward ||
      !district ||
      !addressLine
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing receiver/address information",
      });
    }

    let shippingFee = 0;

    if (shipping_method_id) {
      if (!isValidObjectId(shipping_method_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shipping_method_id",
        });
      }

      const shippingMethod = await ShippingMethod.findById(shipping_method_id);

      if (!shippingMethod) {
        return res.status(404).json({
          success: false,
          message: "Shipping method not found",
        });
      }

      shippingFee = Number(shippingMethod.base_fee || 0);
    }

    const finalItems = await getItemsFromRequestOrCart({
      items,
      cart_id,
      user_id: targetUserId,
    });

    const { orderItems, subtotal } = await buildOrderItems(finalItems);

    const { coupon, discountAmount } = await calculateDiscount(
      coupon_code,
      targetUserId,
      subtotal
    );

    const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

    const finalReceiverEmail =
      String(receiver_email || req.user?.email || "guest@example.com").trim() ||
      "guest@example.com";

    const order = await Order.create({
      user_id: targetUserId || null,
      shipping_method_id: shipping_method_id || null,
      receiver_name,
      receiver_phone,
      receiver_email: finalReceiverEmail,
      address_province: province,
      address_ward: ward,
      address_district: district,
      address_address_line: addressLine,
      subtotal,
      total_amount: totalAmount,
      status: status || "pending",
      payment_method,
      payment_status:
        payment_status || (payment_method === "cod" ? "unpaid" : "pending"),
      coupon_code: coupon ? coupon.code : normalizeCouponCode(coupon_code),
    });

    const createdItems = await OrderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        order_id: order._id,
      }))
    );

    for (const item of orderItems) {
      if (item.variant_id) {
        await ProductVariant.findByIdAndUpdate(item.variant_id, {
          $inc: {
            stock_quantity: -item.quantity,
          },
        });
      }
    }

    if (coupon && targetUserId) {
      await CouponUsage.findOneAndUpdate(
        {
          coupon_id: coupon._id,
          user_id: targetUserId,
        },
        {
          $inc: {
            used_count: 1,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    if (cart_id) {
      await CartItem.deleteMany({ cart_id });
    }

    return res.status(201).json({
      success: true,
      message: "Create order successfully",
      data: {
        order,
        items: createdItems,
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { user_id, status, payment_status } = req.query;

    const filter = {};

    if (user_id) {
      if (!isValidObjectId(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user_id",
        });
      }

      filter.user_id = user_id;
    }

    if (status) {
      if (!ORDER_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`,
        });
      }

      filter.status = status;
    }

    if (payment_status) {
      if (!PAYMENT_STATUS.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(", ")}`,
        });
      }

      filter.payment_status = payment_status;
    }

    const orders = await Order.find(filter)
      .populate("user_id", "name email phone")
      .populate("shipping_method_id", "name base_fee estimate_days is_active")
      .select("-__v")
      .sort({ created_at: -1 })
      .lean();

    const orderIds = orders.map((order) => order._id);

    const items = await OrderItem.find({
      order_id: {
        $in: orderIds,
      },
    })
      .populate("product_id", "name sku status")
      .populate("variant_id", "sku variant_value image price sale_price")
      .select("-__v")
      .lean();

    const itemsByOrder = items.reduce((map, item) => {
      const key = String(item.order_id);

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(item);
      return map;
    }, {});

    const data = orders.map((order) => ({
      ...order,
      items: itemsByOrder[String(order._id)] || [],
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findById(id)
      .populate("user_id", "name email phone")
      .populate("shipping_method_id", "name base_fee estimate_days is_active")
      .select("-__v")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const items = await OrderItem.find({ order_id: id })
      .populate("product_id", "name sku status")
      .populate("variant_id", "sku variant_value image price sale_price")
      .select("-__v");

    let coupon_usage = null;

    if (order.coupon_code) {
      const coupon = await Coupon.findOne({
        code: normalizeCouponCode(order.coupon_code),
      });

      if (coupon) {
        coupon_usage = await CouponUsage.findOne({
          user_id: order.user_id?._id || order.user_id,
          coupon_id: coupon._id,
        }).populate("coupon_id", "code name discount_type discount_value");
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        order,
        items,
        coupon_usage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get order",
      error: error.message,
    });
  }
};

const updateOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const allowedFields = [
      "shipping_method_id",
      "receiver_name",
      "receiver_phone",
      "address_province",
      "address_ward",
      "address_district",
      "address_address_line",
      "subtotal",
      "total_amount",
      "status",
      "payment_method",
      "payment_status",
      "coupon_code",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.status && !ORDER_STATUS.includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`,
      });
    }

    if (
      updateData.payment_status &&
      !PAYMENT_STATUS.includes(updateData.payment_status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(", ")}`,
      });
    }

    if (updateData.shipping_method_id && !isValidObjectId(updateData.shipping_method_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping_method_id",
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data to update",
      });
    }

    const data = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Update order successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Prevent cancelling after the order has been shipped or completed
    if (["shipping", "completed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled after it has been shipped or completed",
      });
    }

    // If already cancelled, return informative response
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This order is already cancelled",
      });
    }

    const items = await OrderItem.find({ order_id: id });

    for (const item of items) {
      if (item.variant_id) {
        await ProductVariant.findByIdAndUpdate(item.variant_id, {
          $inc: {
            stock_quantity: item.quantity,
          },
        });
      }
    }

    order.status = "cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Cancel order successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { status, payment_status } = req.query;
    const filter = { user_id: userId };

    if (status) {
      if (!ORDER_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`,
        });
      }
      filter.status = status;
    }

    if (payment_status) {
      if (!PAYMENT_STATUS.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(", ")}`,
        });
      }
      filter.payment_status = payment_status;
    }

    const orders = await Order.find(filter)
      .populate("shipping_method_id", "name base_fee estimate_days is_active")
      .select("-__v")
      .sort({ created_at: -1 })
      .lean();

    const orderIds = orders.map((order) => order._id);

    const items = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate("product_id", "name sku status")
      .populate("variant_id", "sku variant_value image price sale_price")
      .select("-__v")
      .lean();

    const itemsByOrder = items.reduce((map, item) => {
      const key = String(item.order_id);
      if (!map[key]) map[key] = [];
      map[key].push(item);
      return map;
    }, {});

    const data = orders.map((order) => ({
      ...order,
      items: itemsByOrder[String(order._id)] || [],
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get orders",
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderById,
  cancelOrder,
};