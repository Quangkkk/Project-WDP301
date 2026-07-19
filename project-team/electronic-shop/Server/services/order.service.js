const mongoose = require("mongoose");

const Order = require("../models/Orders.model");
const OrderItem = require(
  "../models/OrderItem.model"
);
const Cart = require("../models/Cart.model");
const CartItem = require(
  "../models/CartItem.model"
);
const Product = require(
  "../models/Product.model"
);
const ProductVariant = require(
  "../models/ProductVariant.model"
);
const ShippingMethod = require(
  "../models/ShippingMethod.model"
);
const Coupon = require("../models/Coupon.model");
const CouponUsage = require(
  "../models/CouponUsage.model"
);
const couponService = require(
  "./coupon.service"
);

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

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(
    String(id || "")
  );

// Lay danh sach mat hang tu request hoac gio hang
const getItemsFromRequestOrCart = async ({
  items,
  cart_id,
  user_id,
}) => {
  if (
    Array.isArray(items) &&
    items.length > 0
  ) {
    return items;
  }

  if (cart_id) {
    if (!isValidObjectId(cart_id)) {
      throw new Error("Invalid cart_id");
    }

    const cart = await Cart.findOne({
      _id: cart_id,
      user_id,
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    const cartItems = await CartItem.find({
      cart_id: cart._id,
    }).lean();

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
    const cart = await Cart.findOne({
      user_id,
    });

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

  throw new Error(
    "items or cart_id is required"
  );
};

// Chi xoa/decrement item da checkout
const removeOrderedItemsFromCart = async ({
  cart_id,
  user_id,
  orderedItems,
  hasExplicitItems,
}) => {
  let cart = null;

  if (cart_id) {
    cart = await Cart.findOne({
      _id: cart_id,
      user_id,
    });
  } else {
    cart = await Cart.findOne({
      user_id,
    });
  }

  if (!cart) {
    return;
  }

  // Dat toan bo gio hang
  if (!hasExplicitItems) {
    await CartItem.deleteMany({
      cart_id: cart._id,
    });

    return;
  }

  // Dat mot phan gio hang
  for (const item of orderedItems) {
    const cartItem = await CartItem.findOne({
      cart_id: cart._id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
    });

    if (!cartItem) {
      continue;
    }

    const orderedQuantity = Math.max(
      Number(item.quantity || 1),
      1
    );

    if (
      cartItem.quantity > orderedQuantity
    ) {
      cartItem.quantity -= orderedQuantity;
      await cartItem.save();
    } else {
      await cartItem.deleteOne();
    }
  }
};

// Kiem tra stock va tinh tong tien. Gia luon lay tu database, khong tin gia frontend.
const buildOrderItems = async (items) => {
  const orderItems = [];
  let subtotal = 0;

  for (const rawItem of items) {
    const productId = rawItem.product_id;
    const variantId = rawItem.variant_id;
    const quantity = Number(rawItem.quantity || 1);

    if (!isValidObjectId(productId)) {
      throw new Error("Invalid product_id in items");
    }

    if (!isValidObjectId(variantId)) {
      throw new Error("Valid variant_id is required for every order item");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Item quantity must be greater than 0");
    }

    const product = await Product.findById(productId).lean();

    if (!product) {
      throw new Error("Product not found");
    }

    if (String(product.status || "active").toLowerCase() !== "active") {
      throw new Error(`Product ${product.sku || productId} is inactive`);
    }

    const variant = await ProductVariant.findOne({
      _id: variantId,
      product_id: productId,
    }).lean();

    if (!variant) {
      throw new Error("Variant not found or does not belong to product");
    }

    if (!variant.is_active) {
      throw new Error(`Variant ${variant.sku} is inactive`);
    }

    if (Number(variant.stock_quantity || 0) < quantity) {
      throw new Error(`Not enough stock for ${variant.sku}`);
    }

    const unitPrice =
      Number(variant.sale_price || 0) > 0
        ? Number(variant.sale_price)
        : Number(variant.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("Variant price is invalid");
    }

    const itemSubtotal = unitPrice * quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      product_id: productId,
      variant_id: variantId,
      image: variant.image || null,
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

const rollbackCouponUsage = async ({ coupon, userId }) => {
  if (!coupon) return;

  const usage = await CouponUsage.findOneAndUpdate(
    {
      coupon_id: coupon._id,
      user_id: userId,
      used_count: { $gt: 0 },
    },
    {
      $inc: { used_count: -1 },
    },
    { new: true }
  );

  if (usage && Number(usage.used_count || 0) <= 0) {
    await CouponUsage.deleteOne({ _id: usage._id });
  }
};

const rollbackStock = async (stockChanges) => {
  for (const change of stockChanges) {
    await ProductVariant.findByIdAndUpdate(change.variant_id, {
      $inc: { stock_quantity: change.quantity },
    });
  }
};

// Tao don hang
const createOrder = async (orderData) => {
  const {
    user_id,
    shipping_method_id,
    payment_method = "cod",
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
    note,
  } = orderData;

  if (!user_id || !isValidObjectId(user_id)) {
    throw new Error("Valid user_id is required");
  }

  const normalizedPaymentMethod = String(payment_method || "cod").toLowerCase();
  const allowedPaymentMethods = ["cod", "bank_transfer", "zalopay"];

  if (!allowedPaymentMethods.includes(normalizedPaymentMethod)) {
    throw new Error("Invalid payment method");
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
    throw new Error("Missing receiver/address information");
  }

  let shippingFee = 0;

  if (shipping_method_id) {
    if (!isValidObjectId(shipping_method_id)) {
      throw new Error("Invalid shipping_method_id");
    }

    const shippingMethod = await ShippingMethod.findById(shipping_method_id);

    if (!shippingMethod) {
      throw new Error("Shipping method not found");
    }

    if (shippingMethod.is_active === false) {
      throw new Error("Shipping method is inactive");
    }

    shippingFee = Number(shippingMethod.base_fee || 0);
  }

  const hasExplicitItems = Array.isArray(items) && items.length > 0;
  const finalItems = await getItemsFromRequestOrCart({
    items,
    cart_id,
    user_id,
  });

  const { orderItems, subtotal } = await buildOrderItems(finalItems);

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

  const order = await Order.create({
    user_id,
    shipping_method_id: shipping_method_id || null,
    receiver_name: String(receiver_name).trim(),
    receiver_phone: String(receiver_phone).trim(),
    address_province: String(province).trim(),
    address_ward: String(ward).trim(),
    address_district: String(district).trim(),
    address_address_line: String(addressLine).trim(),
    subtotal,
    total_amount: totalAmount,
    status: "pending",
    payment_method: normalizedPaymentMethod,
    payment_status: normalizedPaymentMethod === "cod" ? "unpaid" : "pending",
    coupon_code: coupon
      ? coupon.code
      : coupon_code
        ? coupon_code.trim().toUpperCase()
        : null,
    note: note ? String(note).trim().slice(0, 1000) : null,
  });

  let createdItems = [];
  const stockChanges = [];
  let couponUsageIncremented = false;

  try {
    createdItems = await OrderItem.insertMany(
      orderItems.map((item) => ({
        ...item,
        order_id: order._id,
      }))
    );

    for (const item of orderItems) {
      const updatedVariant = await ProductVariant.findOneAndUpdate(
        {
          _id: item.variant_id,
          is_active: true,
          stock_quantity: { $gte: item.quantity },
        },
        {
          $inc: { stock_quantity: -item.quantity },
        },
        { new: true }
      );

      if (!updatedVariant) {
        throw new Error("Not enough stock while creating order");
      }

      stockChanges.push({
        variant_id: item.variant_id,
        quantity: item.quantity,
      });
    }

    if (coupon) {
      await CouponUsage.findOneAndUpdate(
        {
          coupon_id: coupon._id,
          user_id,
        },
        {
          $inc: { used_count: 1 },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      couponUsageIncremented = true;
    }
  } catch (error) {
    try {
      await rollbackStock(stockChanges);

      if (couponUsageIncremented) {
        await rollbackCouponUsage({ coupon, userId: user_id });
      }

      await OrderItem.deleteMany({ order_id: order._id });
      await Order.findByIdAndDelete(order._id);
    } catch (rollbackError) {
      console.error("[order.createOrder.rollback]", rollbackError);
    }

    throw error;
  }

  // Don hang da tao thanh cong. Loi don dep cart khong duoc lam mat don/stock.
  try {
    await removeOrderedItemsFromCart({
      cart_id,
      user_id,
      orderedItems: finalItems,
      hasExplicitItems,
    });
  } catch (cartCleanupError) {
    console.error("[order.createOrder.cartCleanup]", cartCleanupError);
  }

  return {
    order,
    items: createdItems,
    subtotal,
    shipping_fee: shippingFee,
    discount_amount: discountAmount,
  };
};

// Lay danh sach don hang
const getAllOrders = async (
  queryParams,
  currentUser
) => {
  const {
    user_id,
    status,
    payment_status,
  } = queryParams;

  const filter = {};
  const role = String(
    currentUser.role || ""
  ).toUpperCase();

  if (role === "CUSTOMER") {
    filter.user_id =
      currentUser.user_id;
  } else if (user_id) {
    if (!isValidObjectId(user_id)) {
      throw new Error("Invalid user_id");
    }

    filter.user_id = user_id;
  }

  if (status) {
    if (!ORDER_STATUS.includes(status)) {
      throw new Error(
        `Invalid order status. Allowed: ${ORDER_STATUS.join(
          ", "
        )}`
      );
    }

    filter.status = status;
  }

  if (payment_status) {
    if (
      !PAYMENT_STATUS.includes(
        payment_status
      )
    ) {
      throw new Error(
        `Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(
          ", "
        )}`
      );
    }

    filter.payment_status =
      payment_status;
  }

  const orders = await Order.find(filter)
    .populate(
      "user_id",
      "name email phone"
    )
    .populate(
      "shipping_method_id",
      "name base_fee estimate_days is_active"
    )
    .select("-__v")
    .sort({
      created_at: -1,
    })
    .lean();

  const orderIds = orders.map(
    (order) => order._id
  );

  const items = await OrderItem.find({
    order_id: {
      $in: orderIds,
    },
  })
    .populate(
      "product_id",
      "name sku status"
    )
    .populate(
      "variant_id",
      "sku variant_value image price sale_price"
    )
    .select("-__v")
    .lean();

  const itemsByOrder = items.reduce(
    (map, item) => {
      const key = String(item.order_id);

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(item);

      return map;
    },
    {}
  );

  return orders.map((order) => ({
    ...order,
    items:
      itemsByOrder[String(order._id)] ||
      [],
  }));
};

// Lay chi tiet don hang
const getOrderById = async (
  id,
  currentUser
) => {
  const order = await Order.findById(id)
    .populate(
      "user_id",
      "name email phone"
    )
    .populate(
      "shipping_method_id",
      "name base_fee estimate_days is_active"
    )
    .select("-__v")
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  const role = String(
    currentUser.role || ""
  ).toUpperCase();

  const ownerId =
    order.user_id?._id ||
    order.user_id;

  if (
    role === "CUSTOMER" &&
    String(ownerId) !==
      String(currentUser.user_id)
  ) {
    throw new Error(
      "Access denied. You do not have permission."
    );
  }

  const items = await OrderItem.find({
    order_id: id,
  })
    .populate(
      "product_id",
      "name sku status"
    )
    .populate(
      "variant_id",
      "sku variant_value image price sale_price"
    )
    .select("-__v");

  let couponUsage = null;

  if (order.coupon_code) {
    const coupon = await Coupon.findOne({
      code: order.coupon_code.toUpperCase(),
    });

    if (coupon) {
      couponUsage =
        await CouponUsage.findOne({
          user_id: ownerId,
          coupon_id: coupon._id,
        }).populate(
          "coupon_id",
          "code name discount_type discount_value"
        );
    }
  }

  return {
    order,
    items,
    coupon_usage: couponUsage,
  };
};

// Cap nhat don hang
const updateOrderById = async (
  id,
  updateFields,
  handledByUserId = null
) => {
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
    if (
      updateFields[field] !== undefined
    ) {
      updateData[field] =
        updateFields[field];
    }
  }

  if (
    updateData.status &&
    !ORDER_STATUS.includes(
      updateData.status
    )
  ) {
    throw new Error(
      `Invalid order status. Allowed: ${ORDER_STATUS.join(
        ", "
      )}`
    );
  }

  if (
    updateData.payment_status &&
    !PAYMENT_STATUS.includes(
      updateData.payment_status
    )
  ) {
    throw new Error(
      `Invalid payment_status. Allowed: ${PAYMENT_STATUS.join(
        ", "
      )}`
    );
  }

  if (
    updateData.shipping_method_id &&
    !isValidObjectId(
      updateData.shipping_method_id
    )
  ) {
    throw new Error(
      "Invalid shipping_method_id"
    );
  }

  if (handledByUserId) {
    updateData.handled_by =
      handledByUserId;
  }

  if (
    Object.keys(updateData).length === 0
  ) {
    throw new Error(
      "No data to update"
    );
  }

  const data =
    await Order.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-__v");

  if (!data) {
    throw new Error("Order not found");
  }

  return data;
};

// Huy don hang
const cancelOrder = async (
  id,
  currentUser,
  cancelReason = null
) => {
  const order =
    await Order.findById(id);

  if (!order) {
    throw new Error("Order not found");
  }

  const role = String(
    currentUser.role || ""
  ).toUpperCase();

  if (
    role === "CUSTOMER" &&
    String(order.user_id) !==
      String(currentUser.user_id)
  ) {
    throw new Error(
      "Access denied. You do not have permission."
    );
  }

  const isStaff = [
    "STAFF",
    "MANAGER",
    "ADMIN",
  ].includes(role);

  if (
    isStaff &&
    (!cancelReason ||
      !cancelReason.trim())
  ) {
    throw new Error(
      "Cancel reason is required when cancelled by staff"
    );
  }

  if (
    [
      "shipping",
      "completed",
      "cancelled",
    ].includes(order.status)
  ) {
    throw new Error(
      "This order cannot be cancelled"
    );
  }

  const items = await OrderItem.find({
    order_id: id,
  });

  for (const item of items) {
    if (item.variant_id) {
      await ProductVariant.findByIdAndUpdate(
        item.variant_id,
        {
          $inc: {
            stock_quantity:
              item.quantity,
          },
        }
      );
    }
  }

  order.status = "cancelled";

  if (cancelReason && String(cancelReason).trim()) {
    order.cancel_reason = String(cancelReason).trim().slice(0, 1000);
  }

  await order.save();

  try {
    const User = require(
      "../models/User.model"
    );

    const customer =
      await User.findById(
        order.user_id
      );

    if (
      customer &&
      customer.email
    ) {
      const sendMail = require(
        "../mailtrap/nodemailer"
      );

      await sendMail({
        email: customer.email,
        subject:
          `Don hang #${order._id} cua ban da bi huy`,
        html: `
          <p>Xin chao <b>${customer.name}</b>,</p>
          <p>
            Don hang <b>#${order._id}</b>
            cua ban da bi huy.
          </p>
          ${
            order.cancel_reason
              ? `<p><b>Ly do:</b> ${order.cancel_reason}</p>`
              : ""
          }
          <p>
            San pham trong don hang da duoc
            hoan lai kho.
          </p>
        `,
      });
    }
  } catch (error) {
    console.error(
      "Failed to send order cancel email:",
      error.message
    );
  }

  return order;
};

// Tra cuu don hang cho guest
const trackGuestOrder = async ({
  order_code,
  contact,
}) => {
  if (!order_code || !contact) {
    throw new Error(
      "order_code and contact (email or phone) are required"
    );
  }

  if (!isValidObjectId(order_code)) {
    throw new Error(
      "Invalid order_code format. Must be a valid Order ID."
    );
  }

  const order = await Order.findById(
    order_code
  )
    .populate(
      "user_id",
      "email name"
    )
    .lean();

  if (!order) {
    throw new Error("Order not found");
  }

  const contactClean = String(contact)
    .trim()
    .toLowerCase();

  const phoneClean = String(
    order.receiver_phone || ""
  ).trim();

  const emailClean = String(
    order.user_id?.email || ""
  )
    .trim()
    .toLowerCase();

  if (
    contactClean !== phoneClean &&
    contactClean !== emailClean
  ) {
    throw new Error(
      "Access denied. Contact information does not match the order."
    );
  }

  const items = await OrderItem.find({
    order_id: order._id,
  })
    .populate(
      "product_id",
      "name sku"
    )
    .populate(
      "variant_id",
      "variant_value image price sale_price"
    )
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