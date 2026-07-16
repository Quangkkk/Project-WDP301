const express = require("express");
const product = require("../Controller/product.controller");
const review = require("../Controller/review.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Routes xem danh sach va chi tiet san pham (Public - khong can login)
router.get("/", product.getAllProducts);
router.get("/category/:id", product.getProductByCategory);
router.get("/brand/:id", product.getProductByBrand);
router.get("/:id", product.getProductById);
router.get("/:id/reviews", review.getProductReviews);

// Routes quan ly san pham va variants (Chi ADMIN hoac MANAGER)
router.post("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), product.createProduct);
router.post("/:productId/variants", verifyToken, authorizeRoles("ADMIN", "MANAGER"), product.createVariant);
router.put("/variant/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), product.updateVariant);
router.delete("/variant/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), product.deleteVariant);
router.put("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), product.updateProductById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), product.deleteProductById);

module.exports = router;