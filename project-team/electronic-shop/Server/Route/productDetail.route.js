const express = require("express");
const router = express.Router();
const productDetail = require("../Controller/productDetail.controller");

router.post("/", productDetail.addProductDetail);

router.get("/", productDetail.getAllProductDetails);
router.get("/:id", productDetail.getProductDetailById);

router.put("/:id", productDetail.updateProductDetailById);

router.delete("/:id", productDetail.deleteProductDetailById);

module.exports = router;