const user = require("./user.controller");
const category = require("./category.controller");
const brand = require("./brand.controller");
const product = require("./product.controller");
const productDetail = require("./productDetail.controller");

const controllers = {
  user,
  category,
  brand,
  product,
  productDetail,
};

module.exports = controllers;