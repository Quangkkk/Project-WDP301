const test = require("node:test");
const assert = require("node:assert/strict");

const routers = require("../routes");
const cartService = require("../services/cart.service");
const orderService = require("../services/order.service");
const reviewService = require("../services/review.service");
const wishlistService = require("../services/wishlist.service");
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