const express = require("express");
const order = require("../controller/order.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/", verifyToken, order.createOrder);
router.get(
  "/",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER", "STAFF"),
  order.getAllOrders
);
router.get("/:id", verifyToken, order.getOrderById);
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER", "STAFF"),
  order.updateOrderById
);
router.patch("/:id/cancel", verifyToken, order.cancelOrder);

module.exports = router;