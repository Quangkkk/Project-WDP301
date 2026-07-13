const auth = require("./auth.controller");
const user = require("./user.controller");
const category = require("./category.controller");
const brand = require("./brand.controller");
const product = require("./product.controller");
const cart = require("./cart.controller");
const order = require("./order.controller");
const review = require("./review.controller");
const coupon = require("./coupon.controller");
const shippingMethod = require("./shippingMethod.controller");
const role = require("./role.controller");
const support = require("./support.controller");
const chat = require("./chat.controller");
const wishlist = require("./wishlist.controller");

module.exports = {
  auth,
  user,
  category,
  brand,
  product,
  cart,
  order,
  review,
  coupon,
  shippingMethod,
  role,
  support,
  chat,
  wishlist,
};