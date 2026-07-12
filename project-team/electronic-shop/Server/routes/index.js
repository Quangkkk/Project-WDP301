const auth = require("./auth.route.js");
const user = require("./user.route.js");
const product = require("./product.route.js");
const category = require("./category.route.js");
const brand = require("./brand.route.js");
const cart = require("./cart.route.js");
const order = require("./order.route.js");
const review = require("./review.route.js");
const coupon = require("./coupon.route.js");
const shippingMethod = require("./shippingMethod.route.js");
const role = require("./role.route.js");
const support = require("./support.route.js");
const chat = require("./chat.route.js");
const wishlist = require("./wishlist.route.js");
const payment = require("./payment.route.js");

module.exports = {
  auth,
  user,
  product,
  category,
  brand,
  cart,
  order,
  review,
  coupon,
  shippingMethod,
  role,
  support,
  chat,
  wishlist,
  payment,
};