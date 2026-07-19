const express = require("express");
const wishlist = require("../Controller/wishlist.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

const customerOnly = [
  verifyToken,
  authorizeRoles("CUSTOMER"),
];

// Public: dem tong so nguoi yeu thich mot san pham
router.get(
  "/product/:productId/count",
  wishlist.getProductWishlistCount
);

// Lay danh sach san pham yeu thich cua customer dang dang nhap
router.get(
  "/",
  ...customerOnly,
  wishlist.getSelfWishlist
);

// Kiem tra mot san pham da nam trong wishlist hay chua
router.get(
  "/check",
  ...customerOnly,
  wishlist.checkSelfWishlist
);

// Them san pham vao wishlist
router.post(
  "/",
  ...customerOnly,
  wishlist.addSelfWishlist
);

// Them neu chua co, xoa neu da co
router.post(
  "/toggle",
  ...customerOnly,
  wishlist.toggleSelfWishlist
);

// Route tuong thich voi frontend cu
router.delete(
  "/user/:userId/product/:productId",
  ...customerOnly,
  wishlist.deleteSelfWishlistByUserAndProduct
);

// Ho tro ca wishlist document ID va product ID
router.delete(
  "/:identifier",
  ...customerOnly,
  wishlist.deleteSelfWishlist
);

module.exports = router;