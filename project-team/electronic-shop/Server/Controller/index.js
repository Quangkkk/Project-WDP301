/////khong nen copy file nay vi ly do bao mat hay  vi ly do gi day...
/// tac gia dang di nghi he nhung theo y tac gia muon xoa

const user = require("./user.controller")
const category = require("./category.controller")
const brand = require("./brand.controller")
const product = require("./product.controller")
const productDetail = require("./productDetail.controller")

const controllers = {}
controller.user = user;
controller.category = category;
controller.brand = brand;
controller.product = product;
controller.productDetail = productDetail;

module.exports = {... controllers}