const express = require("express");
const order = require("../Controller/order.controller");
const verifyToken = require("../middleware/verifyToken");
const optionalAuth = require("../middleware/optionalAuth");
const authorizeRoles = require("../middleware/authorizeRoles");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// Guest tra cứu bằng mã đơn + email/số điện thoại.
router.post("/track", rateLimiter, order.trackGuestOrder);

// STAFF xem toàn bộ yêu cầu trả hàng đang được nhúng trong Order.
// Route này phải đặt trước /:id để "return-requests" không bị hiểu là order id.
router.get(
  "/return-requests",
  verifyToken,
  authorizeRoles("STAFF"),
  order.getReturnRequests
);

// Tạo đơn hỗ trợ customer đã đăng nhập và guest.
router.post("/", optionalAuth, order.createOrder);

// Lịch sử/chi tiết đơn chỉ dành cho tài khoản đã đăng nhập.
router.get("/", verifyToken, order.getAllOrders);
router.get("/:id", verifyToken, order.getOrderById);
router.patch("/:id/cancel", verifyToken, order.cancelOrder);

// CUSTOMER gửi yêu cầu trả hàng cho đơn đã hoàn thành.
router.post(
  "/:id/return-request",
  verifyToken,
  authorizeRoles("CUSTOMER"),
  order.createReturnRequest
);

// Chỉ STAFF được duyệt hoặc từ chối yêu cầu trả hàng.
router.patch(
  "/:id/return-request/review",
  verifyToken,
  authorizeRoles("STAFF"),
  order.reviewReturnRequest
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER", "STAFF"),
  order.updateOrderById
);

module.exports = router;