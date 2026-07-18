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
const User = require("../models/User.model");
const couponService = require("./coupon.service");

const ORDER_STATUS = ["pending", "confirmed", "processing", "shipping", "completed", "cancelled"];
const PAYMENT_STATUS = ["unpaid", "pending", "paid", "failed", "refunded"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

// Helper lay danh sach mat hang tu request body hoac gio hang
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
      const cartItems = await CartItem.find({ cart_id: cart._id }).lean();
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

// Helper kiem tra stock va tinh tam tinh cho tung item
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

// Tao don hang moi (kem theo tinh toan coupon, update ton kho, xoa gio hang)
const createOrder = async (orderData) => {
  const {
    user_id,
    shipping_method_id,
    status,
    payment_method = "cod",
    payment_status,
    receiver_name,
    receiver_phone,
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
  } = orderData;

  if (!user_id || !isValidObjectId(user_id)) {
    throw new Error("Valid user_id is required");
  }

  const province = address_province || shipping_province;
  const ward = address_ward || shipping_ward;
  const district = address_district || shipping_district;
  const addressLine = address_address_line || shipping_address_line;

  if (!receiver_name || !receiver_phone || !province || !ward || !district || !addressLine) {
    throw new Error("Missing receiver/address information");
  }

  // Tinh phi van chuyen
  let shippingFee = 0;
  if (shipping_method_id) {
    if (!isValidObjectId(shipping_method_id)) {
      throw new Error("Invalid shipping_method_id");
    }
    const shippingMethod = await ShippingMethod.findById(shipping_method_id);
    if (!shippingMethod) {
      throw new Error("Shipping method not found");
    }
    shippingFee = Number(shippingMethod.base_fee || 0);
  }

  // Lay items va validate logic
  const finalItems = await getItemsFromRequestOrCart({ items, cart_id, user_id });
  const { orderItems, subtotal } = await buildOrderItems(finalItems);

  // Validate coupon dung service cua coupon
  let discountAmount = 0;
  let coupon = null;
  if (coupon_code) {
    const validated = await couponService.validateCoupon({
      code: coupon_code,
      user_id,
      order_amount: subtotal,
    });
    coupon = validated.coupon;
    discountAmount = validated.discount_amount;
  }

  const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

  // Tao document Order
  const order = await Order.create({
    user_id,
    shipping_method_id: shipping_method_id || null,
    receiver_name,
    receiver_phone,
    address_province: province,
    address_ward: ward,
    address_district: district,
    address_address_line: addressLine,
    subtotal,
    total_amount: totalAmount,
    status: status || "pending",
    payment_method,
    payment_status: payment_status || (payment_method === "cod" ? "unpaid" : "pending"),
    coupon_code: coupon ? coupon.code : coupon_code ? coupon_code.trim().toUpperCase() : null,
  });

  // Tao document OrderItems
  const createdItems = await OrderItem.insertMany(
    orderItems.map((item) => ({
      ...item,
      order_id: order._id,
    }))
  );

  // Cap nhat trừ ton kho variant trong database
  for (const item of orderItems) {
    if (item.variant_id) {
      await ProductVariant.findByIdAndUpdate(item.variant_id, {
        $inc: { stock_quantity: -item.quantity },
      });
    }
  }

  // Ghi nhan luot dung coupon neu co
  if (coupon) {
    await CouponUsage.findOneAndUpdate(
      { coupon_id: coupon._id, user_id },
      { $inc: { used_count: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Clear gio hang sau khi dat hang thanh cong
  if (cart_id) {
    await CartItem.deleteMany({ cart_id });
  } else {
    const cart = await Cart.findOne({ user_id });
    if (cart) {
      await CartItem.deleteMany({ cart_id: cart._id });
    }
  }

  return {
    order,
    items: createdItems,
    subtotal,
    shipping_fee: shippingFee,
    discount_amount: discountAmount,
  };
};

// Lay danh sach don hang (kem theo check phan quyen)
const getAllOrders = async (queryParams, currentUser) => {
  const { user_id, status, payment_status } = queryParams;
  const filter = {};

  // Check phan quyen: Neu la Customer, chi cho xem don hang cua chinh ho
  if (currentUser.role === "CUSTOMER") {
    filter.user_id = currentUser.user_id;
  } else {
    // Admin/Manager/Staff co the xem cua user khac neu truyen param
    if (user_id) {
      if (!isValidObjectId(user_id)) {
        throw new Error("Invalid user_id");
      }
      filter.user_id = user_id;
    }
  }

  if (status) {
    if (!ORDER_STATUS.includes(status)) {
      throw new Error(`Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`);
    }
    filter.status = status;
  }

  if (payment_status) {
    if (!PAYMENT_STATUS.includes(payment_status)) {
      throw new Error(`Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(", ")}`);
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
  const items = await OrderItem.find({ order_id: { $in: orderIds } })
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

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder[String(order._id)] || [],
  }));
};

// Lay chi tiet don hang theo ID (check so huu neu la customer)
const getOrderById = async (id, currentUser) => {
  const order = await Order.findById(id)
    .populate("user_id", "name email phone")
    .populate("shipping_method_id", "name base_fee estimate_days is_active")
    .select("-__v")
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  // Security check: Customer chi duoc xem don hang cua chinh ho
  if (currentUser.role === "CUSTOMER" && String(order.user_id?._id || order.user_id) !== String(currentUser.user_id)) {
    throw new Error("Access denied. You do not have permission.");
  }

  const items = await OrderItem.find({ order_id: id })
    .populate("product_id", "name sku status")
    .populate("variant_id", "sku variant_value image price sale_price")
    .select("-__v");

  let coupon_usage = null;
  if (order.coupon_code) {
    const coupon = await Coupon.findOne({ code: order.coupon_code.toUpperCase() });
    if (coupon) {
      coupon_usage = await CouponUsage.findOne({
        user_id: order.user_id?._id || order.user_id,
        coupon_id: coupon._id,
      }).populate("coupon_id", "code name discount_type discount_value");
    }
  }

  return {
    order,
    items,
    coupon_usage,
  };
};

// Cap nhat thong tin don hang (Admin/Manager/Staff)
const updateOrderById = async (id, updateFields, handledByUserId = null) => {
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
    if (updateFields[field] !== undefined) {
      updateData[field] = updateFields[field];
    }
  }

  if (updateData.status && !ORDER_STATUS.includes(updateData.status)) {
    throw new Error(`Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`);
  }
  if (updateData.payment_status && !PAYMENT_STATUS.includes(updateData.payment_status)) {
    throw new Error(`Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(", ")}`);
  }
  if (updateData.shipping_method_id && !isValidObjectId(updateData.shipping_method_id)) {
    throw new Error("Invalid shipping_method_id");
  }

  // Luu nguoi xu ly don hang neu truyen staff user id
  if (handledByUserId) {
    updateData.handled_by = handledByUserId;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const data = await Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
  if (!data) {
    throw new Error("Order not found");
  }
  return data;
};

// Huy don hang (kiem tra status hop le, tra lai ton kho cho variant, gui email ly do)
const cancelOrder = async (id, currentUser, cancel_reason = null) => {
  const order = await Order.findById(id);
  if (!order) {
    throw new Error("Order not found");
  }

  // Security check: Customer chi duoc huy don hang cua chinh ho
  if (currentUser.role === "CUSTOMER" && String(order.user_id) !== String(currentUser.user_id)) {
    throw new Error("Access denied. You do not have permission.");
  }

  const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(currentUser.role);
  if (isStaff && (!cancel_reason || !cancel_reason.trim())) {
    throw new Error("Cancel reason is required when cancelled by staff");
  }

  // Chi cho phep huy neu chua shipping, completed hoac da cancelled truoc do
  if (["shipping", "completed", "cancelled"].includes(order.status)) {
    throw new Error("This order cannot be cancelled");
  }

  const items = await OrderItem.find({ order_id: id });

  // Hoan lai ton kho cho các variant co trong don hang
  for (const item of items) {
    if (item.variant_id) {
      await ProductVariant.findByIdAndUpdate(item.variant_id, {
        $inc: { stock_quantity: item.quantity },
      });
    }
  }

  order.status = "cancelled";
  if (isStaff && cancel_reason) {
    order.cancel_reason = cancel_reason.trim();
  }
  await order.save();

  // Gui email thong bao cho khach hang ve viec huy don
  try {
    const User = require("../models/User.model");
    const customer = await User.findById(order.user_id);
    if (customer && customer.email) {
      const sendMail = require("../mailtrap/nodemailer");
      await sendMail({
        email: customer.email,
        subject: `Don hang #${order._id} cua ban da bi huy`,
        html: `<p>Xin chao <b>${customer.name}</b>,</p>
               <p>Chung toi rat tiec phai thong bao rang don hang <b>#${order._id}</b> cua ban da bi huy boi ${isStaff ? 'cua hang' : 'ban'}.</p>
               ${order.cancel_reason ? `<p><b>Ly do huy don:</b> ${order.cancel_reason}</p>` : ""}
               <p>San pham trong don hang da duoc hoan lai vao kho hang. Cam on ban da dong hanh cung Electronic Shop.</p>`
      });
    }
  } catch (err) {
    console.error("Failed to send order cancel email:", err.message);
  }

  return order;
};

// Khach vang lai (Guest) tra cuu don hang khong can dang nhap
const trackGuestOrder = async ({ order_code, contact }) => {
  if (!order_code || !contact) {
    throw new Error("order_code and contact (email or phone) are required");
  }

  let filter = {};
  if (mongoose.Types.ObjectId.isValid(order_code)) {
    filter._id = order_code;
  } else {
    try {
      filter._id = new mongoose.Types.ObjectId(order_code);
    } catch (e) {
      throw new Error("Invalid order_code format. Must be a valid Order ID.");
    }
  }

  const order = await Order.findOne(filter)
    .populate("user_id", "email name")
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  const contactClean = contact.trim().toLowerCase();
  const phoneClean = order.receiver_phone ? order.receiver_phone.trim() : "";
  const emailClean = order.user_id?.email ? order.user_id.email.trim().toLowerCase() : "";

  if (contactClean !== phoneClean && contactClean !== emailClean) {
    throw new Error("Access denied. Contact information does not match the order.");
  }

  const items = await OrderItem.find({ order_id: order._id })
    .populate("product_id", "name sku")
    .populate("variant_id", "variant_value image price sale_price")
    .lean();

  return {
    order,
    items,
  };
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderById,
  cancelOrder,
  trackGuestOrder,
  ORDER_STATUS,
  PAYMENT_STATUS,
};
