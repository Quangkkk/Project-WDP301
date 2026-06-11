const user = require("./user.controller");
const category = require("./category.controller");
const brand = require("./brand.controller");
const product = require("./product.controller");
const payment = require("./payment.controller");
const auth = require("./auth.controller");

module.exports = {
  user,
  category,
  brand,
  product,
  payment,
  auth,
};