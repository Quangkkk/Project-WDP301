const express = require("express");
const product = require("../controller/product.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("MANAGER"), product.createProduct);
router.get("/", verifyToken, authorizeRoles("MANAGER"), product.getAllProducts);
router.get("/category/:id", verifyToken, authorizeRoles("MANAGER"), product.getProductByCategory);
router.get("/brand/:id", verifyToken, authorizeRoles("MANAGER"), product.getProductByBrand);

router.post("/:productId/variants", verifyToken, authorizeRoles("MANAGER"), product.createVariant);
router.put("/variant/:id", verifyToken, authorizeRoles("MANAGER"), product.updateVariant);
router.delete("/variant/:id", verifyToken, authorizeRoles("MANAGER"), product.deleteVariant);

router.get("/:id", verifyToken, authorizeRoles("MANAGER"), product.getProductById);
router.put("/:id", verifyToken, authorizeRoles("MANAGER"), product.updateProductById);
router.delete("/:id", verifyToken, authorizeRoles("MANAGER"), product.deleteProductById);

module.exports = router;