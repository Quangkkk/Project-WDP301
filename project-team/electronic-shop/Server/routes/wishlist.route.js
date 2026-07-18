const express = require("express");
const wishlist = require("../Controller/wishlist.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Lay danh sach san pham yeu thich cua Customer
router.get("/", verifyToken, authorizeRoles("Customer"), wishlist.getSelfWishlist);

// Them san pham vao wishlist
router.post("/", verifyToken, authorizeRoles("Customer"), wishlist.addSelfWishlist);

// Xoa san pham khoi wishlist
router.delete("/:productId", verifyToken, authorizeRoles("Customer"), wishlist.deleteSelfWishlist);

module.exports = router;