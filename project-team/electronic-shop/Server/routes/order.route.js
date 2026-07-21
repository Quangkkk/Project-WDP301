const express = require("express");
const order = require("../controller/order.controller");
const verifyToken = require("../middleware/verifyToken");
const optionalVerifyToken = require("../middleware/optionalVerifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/", optionalVerifyToken, order.createOrder);
// Customer: view own orders (must be logged in, no role restriction)
router.get("/my", verifyToken, order.getMyOrders);
router.get(
  "/",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER", "STAFF"),
  order.getAllOrders
);
router.get("/:id", optionalVerifyToken, order.getOrderById);
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("ADMIN", "STAFF"),
  order.updateOrderById
);
router.patch("/:id/cancel", verifyToken, order.cancelOrder);

module.exports = router;