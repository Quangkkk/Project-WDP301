const test = require("node:test");
const assert = require("node:assert/strict");

const routers = require("../routes");
const cartService = require("../services/cart.service");
const orderService = require("../services/order.service");
const reviewService = require("../services/review.service");
const wishlistService = require("../services/wishlist.service");
const paymentService = require("../services/payment.service");
const paymentController = require("../Controller/payment.controller");
const Order = require("../models/Orders.model");

test("all main routers can be loaded", () => {
  const requiredRouters = [
    "auth",
    "user",
    "product",
    "category",
    "brand",
    "cart",
    "order",
    "review",
    "coupon",
    "shippingMethod",
    "support",
    "chat",
    "wishlist",
    "payment",
  ];

  for (const name of requiredRouters) {
    assert.ok(routers[name], `Missing router: ${name}`);
    assert.equal(typeof routers[name], "function");
  }
});

test("critical backend services expose the expected methods", () => {
  assert.equal(typeof cartService.getCart, "function");
  assert.equal(typeof cartService.addItemToCart, "function");
  assert.equal(typeof cartService.updateCartItem, "function");
  assert.equal(typeof cartService.deleteCartItem, "function");

  assert.equal(typeof orderService.createOrder, "function");
  assert.equal(typeof orderService.cancelOrder, "function");

  assert.equal(typeof reviewService.deleteReview, "function");
  assert.equal(typeof wishlistService.countProductWishlist, "function");
});

test("order schema stores checkout note and cancellation reason", () => {
  assert.ok(Order.schema.path("note"));
  assert.ok(Order.schema.path("cancel_reason"));
});

test("order status enums do not accept arbitrary values", () => {
  const statusValues = Order.schema.path("status").enumValues;
  const paymentStatusValues = Order.schema.path("payment_status").enumValues;

  assert.ok(statusValues.includes("pending"));
  assert.ok(statusValues.includes("completed"));
  assert.ok(!statusValues.includes("hacked"));

  assert.ok(paymentStatusValues.includes("paid"));
  assert.ok(paymentStatusValues.includes("unpaid"));
  assert.ok(!paymentStatusValues.includes("free"));
});

test("payment controller forwards the authenticated user to the service", async () => {
  const orderId = "665000000000000000001201";
  const originalMethod = paymentService.getPaymentByOrder;
  let receivedOrderId = null;
  let receivedCurrentUser = null;

  paymentService.getPaymentByOrder = async (id, currentUser) => {
    receivedOrderId = id;
    receivedCurrentUser = currentUser;
    return { order: { _id: id }, payment: null };
  };

  const req = {
    params: { orderId },
    user_id: "665000000000000000000102",
    role: "CUSTOMER",
  };

  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  try {
    await paymentController.getPaymentByOrder(req, response);
  } finally {
    paymentService.getPaymentByOrder = originalMethod;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.success, true);
  assert.equal(receivedOrderId, orderId);
  assert.deepEqual(receivedCurrentUser, {
    user_id: req.user_id,
    role: req.role,
  });
});