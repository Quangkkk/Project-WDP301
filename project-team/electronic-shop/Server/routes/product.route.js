const express = require("express");
const product = require("../Controller/product.controller");
const review = require("../Controller/review.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");
const productUpload = require("../middleware/productUpload");

const router = express.Router();
const productManagers = [
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER"),
];


const uploadSingleProductImage = (req, res, next) => {
  productUpload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không tải được ảnh sản phẩm.",
      });
    }

    return next();
  });
};

// Public.
router.get("/", product.getAllProducts);
router.get("/category/:id", product.getProductByCategory);
router.get("/brand/:id", product.getProductByBrand);

// Upload dat truoc /:id de khong bi nhan nham la product id.
router.post(
  "/upload-image",
  ...productManagers,
  uploadSingleProductImage,
  product.uploadProductImage
);

router.post("/", ...productManagers, product.createProduct);
router.post("/:productId/variants", ...productManagers, product.createVariant);
router.put("/variant/:id", ...productManagers, product.updateVariant);
router.delete("/variant/:id", ...productManagers, product.deleteVariant);
router.put("/:id", ...productManagers, product.updateProductById);
router.delete("/:id", ...productManagers, product.deleteProductById);

router.get("/:id/reviews", review.getProductReviews);
router.get("/:id", product.getProductById);

module.exports = router;