const express = require("express");
const cart = require("../Controller/cart.controller");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

// Gio hang ho tro ca customer da dang nhap va guest theo session_id.
router.get("/", optionalAuth, cart.getCart);
router.post("/item", optionalAuth, cart.addItemToCart);
router.put("/item/:itemId", optionalAuth, cart.updateCartItem);
router.delete("/item/:itemId", optionalAuth, cart.deleteCartItem);
router.delete("/clear", optionalAuth, cart.clearCart);

module.exports = router;