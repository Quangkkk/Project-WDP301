const express = require("express");
const cart = require("../Controller/cart.controller");

const router = express.Router();

router.get("/", cart.getCart);
router.get("/user/:userId", cart.getCart);
router.post("/item", cart.addItemToCart);
router.put("/item/:itemId", cart.updateCartItem);
router.delete("/item/:itemId", cart.deleteCartItem);
router.delete("/clear", cart.clearCart);
router.delete("/user/:userId/clear", cart.clearCart);

module.exports = router;