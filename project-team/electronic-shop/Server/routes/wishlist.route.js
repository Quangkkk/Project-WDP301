const express = require("express");
const wishlist = require("../controller/wishlist.controller");

const router = express.Router();

router.get("/", wishlist.getAllWishlists);
router.get("/check", wishlist.checkWishlist);
router.get("/user/:userId", wishlist.getWishlistByUser);
router.get("/:id", wishlist.getWishlistById);

router.post("/", wishlist.addToWishlist);
router.post("/toggle", wishlist.toggleWishlist);

router.delete(
  "/user/:userId/product/:productId",
  wishlist.deleteWishlistByUserAndProduct
);
router.delete("/:id", wishlist.deleteWishlistById);

module.exports = router;