const express = require("express");
const order = require("../Controller/order.controller");

const router = express.Router();

router.post("/", order.createOrder);
router.get("/", order.getAllOrders);
router.get("/:id", order.getOrderById);
router.put("/:id", order.updateOrderById);
router.patch("/:id/cancel", order.cancelOrder);

module.exports = router;