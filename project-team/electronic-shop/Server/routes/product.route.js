const express = require("express");
const product = require("../controller/product.controller");

const router = express.Router();

router.post("/", product.createProduct);
router.get("/", product.getAllProducts);
router.get("/category/:id", product.getProductByCategory);
router.get("/brand/:id", product.getProductByBrand);

router.post("/:productId/variants", product.createVariant);
router.put("/variant/:id", product.updateVariant);
router.delete("/variant/:id", product.deleteVariant);

router.get("/:id", product.getProductById);
router.put("/:id", product.updateProductById);
router.delete("/:id", product.deleteProductById);

module.exports = router;