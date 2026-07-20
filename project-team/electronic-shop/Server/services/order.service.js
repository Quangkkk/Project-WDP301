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

const normalizeOrderCode = (value) =>
  String(value || "")
    .trim()
    .replace(/^#/, "")
    .toUpperCase();

const buildOrderCodeFromId = (orderId) =>
  `TS-${String(orderId).slice(-8).toUpperCase()}`;

const generateUniqueOrderIdentity = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderId = new mongoose.Types.ObjectId();
    const orderCode = buildOrderCodeFromId(orderId);
    const existed = await Order.exists({ order_code: orderCode });

    if (!existed) {
      return {
        orderId,
        orderCode,
      };
    }
  }

  throw new Error("Unable to generate a unique order code");
};

const assignOrderCodeIfMissing = async (order) => {
  if (!order || order.order_code) {
    return order;
  }

  const candidate = buildOrderCodeFromId(order._id);
  const existed = await Order.exists({
    order_code: candidate,
    _id: { $ne: order._id },
  });

  if (!existed) {
    order.order_code = candidate;
    await order.save();
  }

  return order;
};

const findLegacyOrderBySuffix = async (suffix) => {
  const matches = await Order.aggregate([
    {
      $addFields: {
        _id_as_string: { $toString: "$_id" },
      },
    },
    {
      $match: {
        $expr: {
          $eq: [
            {
              $toUpper: {
                $substrBytes: ["$_id_as_string", 16, 8],
              },
            },
            suffix,
          ],
        },
      },
    },
    { $limit: 2 },
  ]);

  if (matches.length > 1) {
    throw new Error(
      "Order code is ambiguous. Please contact support."
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return Order.findById(matches[0]._id);
};

const findOrderByPublicCode = async (rawCode) => {
  const normalizedCode = normalizeOrderCode(rawCode);

  if (!normalizedCode) {
    return null;
  }

  let order = null;

  if (/^TS-[A-F0-9]{8}$/.test(normalizedCode)) {
    order = await Order.findOne({ order_code: normalizedCode });

    // Don cu chua co order_code: thu tim bang 8 ky tu cuoi cua MongoDB ObjectId.
    if (!order) {
      order = await findLegacyOrderBySuffix(normalizedCode.slice(-8));
    }
  } else if (/^[A-F0-9]{8}$/.test(normalizedCode)) {
    order = await Order.findOne({
      order_code: `TS-${normalizedCode}`,
    });

    if (!order) {
      order = await findLegacyOrderBySuffix(normalizedCode);
    }
  } else if (isValidObjectId(normalizedCode)) {
    order = await Order.findById(normalizedCode);
  } else {
    throw new Error(
      "Invalid order code format. Use TS-XXXXXXXX, XXXXXXXX, or the full Order ID."
    );
  }

  if (order && !order.order_code) {
    await assignOrderCodeIfMissing(order);
  }

  return order;
};

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
  const { orderId, orderCode } = await generateUniqueOrderIdentity();

  const order = await Order.create({
    _id: orderId,
    order_code: orderCode,
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

// Cap nhat don hang. Khong cho cap nhat truc tiep payment_status/payment_method/tong tien.
const updateOrderById = async (
  id,
  updateFields,
  handledByUserId = null
) => {
  const order = await Order.findById(id);

  if (!order) {
    throw new Error("Order not found");
  }

  const allowedFields = [
    "shipping_method_id",
    "receiver_name",
    "receiver_phone",
    "address_province",
    "address_ward",
    "address_district",
    "address_address_line",
    "status",
    "note",
  ];

  const updateData = {};

  for (const field of allowedFields) {
    if (updateFields[field] !== undefined) {
      updateData[field] = updateFields[field];
    }
  }

  if (updateData.status && !ORDER_STATUS.includes(updateData.status)) {
    throw new Error(
      `Invalid order status. Allowed: ${ORDER_STATUS.join(", ")}`
    );
  }

  if (updateData.status === "cancelled") {
    throw new Error("Use the cancel order endpoint to cancel an order");
  }

  if (["completed", "cancelled"].includes(order.status) && updateData.status && updateData.status !== order.status) {
    throw new Error("Completed or cancelled orders cannot be changed");
  }

  if (updateData.shipping_method_id && !isValidObjectId(updateData.shipping_method_id)) {
    throw new Error("Invalid shipping_method_id");
  }

  if (updateData.note !== undefined) {
    updateData.note = updateData.note
      ? String(updateData.note).trim().slice(0, 1000)
      : null;
  }

  if (updateData.status === "completed") {
    if (order.payment_method === "cod") {
      updateData.payment_status = "paid";
    } else if (order.payment_status !== "paid") {
      throw new Error("Online payment must be paid before completing the order");
    }
  }

  if (handledByUserId) {
    updateData.handled_by = handledByUserId;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const data = await Order.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-__v");

  return data;
};

// Huy don hang va hoan lai stock dung mot lan.
const cancelOrder = async (
  id,
  currentUser,
  cancelReason = null
) => {
  const order = await Order.findById(id);

  if (!order) {
    throw new Error("Order not found");
  }

  const role = String(currentUser.role || "").toUpperCase();

  if (
    role === "CUSTOMER" &&
    String(order.user_id) !== String(currentUser.user_id)
  ) {
    throw new Error("Access denied. You do not have permission.");
  }

  const isStaff = ["STAFF", "MANAGER", "ADMIN"].includes(role);
  const normalizedReason = String(cancelReason || "").trim().slice(0, 1000);

  if (isStaff && !normalizedReason) {
    throw new Error("Cancel reason is required when cancelled by staff");
  }

  if (!["pending", "confirmed", "processing"].includes(order.status)) {
    throw new Error("This order cannot be cancelled");
  }

  if (order.payment_status === "paid") {
    throw new Error("Paid order cannot be cancelled directly. Process a refund first.");
  }

  const nextPaymentStatus =
    order.payment_status === "pending" ? "failed" : order.payment_status;

  // Claim quyen huy bang update co dieu kien de hai request dong thoi
  // khong the cung hoan kho hai lan.
  const cancelledOrder = await Order.findOneAndUpdate(
    {
      _id: id,
      status: order.status,
      payment_status: { $ne: "paid" },
    },
    {
      $set: {
        status: "cancelled",
        payment_status: nextPaymentStatus,
        cancel_reason: normalizedReason || null,
        handled_by: isStaff ? currentUser.user_id : order.handled_by,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!cancelledOrder) {
    throw new Error("Order was already changed or cancelled");
  }

  const PaymentTransaction = require("../models/PaymentTransaction.model");
  const restoredStock = [];
  const pendingPayments = await PaymentTransaction.find({
    order_id: id,
    status: "pending",
  })
    .select("_id")
    .lean();

  try {
    const items = await OrderItem.find({ order_id: id }).lean();

    // Hoàn kho tuần tự để biết chính xác phiên bản nào đã được cập nhật.
    // Nếu một bước sau đó lỗi, các thay đổi đã thực hiện sẽ được đảo ngược.
    for (const item of items) {
      if (!item.variant_id) continue;

      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const updatedVariant = await ProductVariant.findByIdAndUpdate(
        item.variant_id,
        {
          $inc: { stock_quantity: quantity },
        },
        {
          new: true,
        }
      );

      if (!updatedVariant) {
        throw new Error("Product variant not found");
      }

      restoredStock.push({
        variant_id: item.variant_id,
        quantity,
      });
    }

    if (pendingPayments.length > 0) {
      await PaymentTransaction.updateMany(
        {
          _id: { $in: pendingPayments.map((payment) => payment._id) },
        },
        {
          $set: { status: "failed" },
        }
      );
    }
  } catch (error) {
    // Đảo ngược phần tồn kho đã hoàn thành trước khi xảy ra lỗi.
    for (const restoredItem of [...restoredStock].reverse()) {
      try {
        await ProductVariant.findByIdAndUpdate(
          restoredItem.variant_id,
          {
            $inc: { stock_quantity: -restoredItem.quantity },
          }
        );
      } catch (rollbackError) {
        console.error(
          "[order.cancelOrder.rollbackStock]",
          rollbackError.message
        );
      }
    }

    // Khôi phục các giao dịch đang chờ nếu chúng đã bị đổi trạng thái.
    if (pendingPayments.length > 0) {
      try {
        await PaymentTransaction.updateMany(
          {
            _id: { $in: pendingPayments.map((payment) => payment._id) },
          },
          {
            $set: { status: "pending" },
          }
        );
      } catch (rollbackError) {
        console.error(
          "[order.cancelOrder.rollbackPayment]",
          rollbackError.message
        );
      }
    }

    await Order.findOneAndUpdate(
      { _id: id, status: "cancelled" },
      {
        $set: {
          status: order.status,
          payment_status: order.payment_status,
          cancel_reason: order.cancel_reason || null,
          handled_by: order.handled_by || null,
        },
      }
    );

    throw error;
  }

  try {
    const User = require("../models/User.model");
    const displayOrderCode =
      cancelledOrder.order_code || buildOrderCodeFromId(cancelledOrder._id);
    const customer = await User.findById(cancelledOrder.user_id);

    if (customer?.email) {
      const sendMail = require("../mailtrap/nodemailer");

      await sendMail({
        email: customer.email,
        subject: `Don hang #${displayOrderCode} cua ban da bi huy`,
        html: `
          <p>Xin chao <b>${customer.name}</b>,</p>
          <p>Don hang <b>#${displayOrderCode}</b> cua ban da bi huy.</p>
          ${
            cancelledOrder.cancel_reason
              ? `<p><b>Ly do:</b> ${cancelledOrder.cancel_reason}</p>`
              : ""
          }
          <p>San pham trong don hang da duoc hoan lai kho.</p>
        `,
      });
    }
  } catch (error) {
    console.error("Failed to send order cancel email:", error.message);
  }

  return cancelledOrder;
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

  const orderDocument = await findOrderByPublicCode(order_code);

  if (!orderDocument) {
    throw new Error("Order not found");
  }

  await orderDocument.populate(
    "user_id",
    "email name"
  );

  const order = orderDocument.toObject();

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