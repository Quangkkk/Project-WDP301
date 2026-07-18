const express = require("express");
const order = require("../Controller/order.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// Route cong khai tra cuu don hang cho khach vang lai (Guest) - Gioi han tan suat
router.post("/track", rateLimiter, order.trackGuestOrder);

// Routes danh cho khach hang va quan tri vien da dang nhap
router.post("/", verifyToken, order.createOrder);
router.get("/", verifyToken, order.getAllOrders); // Service tu dong loc theo user_id neu role la CUSTOMER
router.get("/:id", verifyToken, order.getOrderById); // Service tu dong check quyen so huu neu la CUSTOMER
router.patch("/:id/cancel", verifyToken, order.cancelOrder); // Service tu dong check quyen so huu neu la CUSTOMER

// Route quan tri don hang (Chi ADMIN, MANAGER hoac STAFF duoc update don/giao hang)
router.put("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER", "STAFF"), order.updateOrderById);

module.exports = router;