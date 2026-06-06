const user = require("./user.route.js");
const product = require("./product.route.js");
const productDetail = require("./productDetail.route.js");
const category = require("./category.route.js");
const brand = require("./brand.route.js");
const payment = require("./payment.route.js");

module.exports = {
  user,
  product,
  productDetail,
  category,
  brand,
  payment,
};