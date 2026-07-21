const express = require("express");
const order = require("../Controller/order.controller");
const verifyToken = require("../middleware/verifyToken");
const optionalAuth = require("../middleware/optionalAuth");
const authorizeRoles = require("../middleware/authorizeRoles");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// Guest tra cuu bang ma don + email/so dien thoai.
router.post("/track", rateLimiter, order.trackGuestOrder);

// Tao don ho tro customer da dang nhap va guest.
router.post("/", optionalAuth, order.createOrder);

// Lich su/chi tiet/huy don chi danh cho tai khoan da dang nhap.
router.get("/", verifyToken, order.getAllOrders);
router.get("/:id", verifyToken, order.getOrderById);
router.patch("/:id/cancel", verifyToken, order.cancelOrder);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER", "STAFF"),
  order.updateOrderById
);

module.exports = router;