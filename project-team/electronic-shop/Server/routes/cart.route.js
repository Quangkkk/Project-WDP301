const express = require("express");
const cart = require("../Controller/cart.controller");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

const optionalAuth = require('../middleware/optionalAuth')

// router.get('/', optionalAuth, cart.getCart)
// router.post('/item', optionalAuth, cart.addItemToCart)
// router.put('/item/:itemId', optionalAuth, cart.updateCartItem)
// router.delete('/item/:itemId', optionalAuth, cart.deleteCartItem)
// router.delete('/clear', optionalAuth, cart.clearCart)

// Tat ca cac thao tac giohang deu can dang nhap de bao mat
router.get("/", verifyToken, cart.getCart);
router.get("/user/:userId", verifyToken, cart.getCart);
router.post("/item", verifyToken, cart.addItemToCart);
router.put("/item/:itemId", verifyToken, cart.updateCartItem);
router.delete("/item/:itemId", verifyToken, cart.deleteCartItem);
router.delete("/clear", verifyToken, cart.clearCart);
router.delete("/user/:userId/clear", verifyToken, cart.clearCart);

module.exports = router;