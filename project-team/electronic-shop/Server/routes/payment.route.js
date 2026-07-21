const express = require("express");
const payment = require("../Controller/payment.controller");
const verifyToken = require("../middleware/verifyToken");
const optionalAuth = require("../middleware/optionalAuth");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Customer dung token dang nhap; guest dung X-Guest-Order-Token.
router.get("/order/:orderId", optionalAuth, payment.getPaymentByOrder);
router.post("/bank-transfer", optionalAuth, payment.createBankTransferPayment);
router.post("/zalopay/create", optionalAuth, payment.createZaloPayPayment);

// Callback tu ZaloPay phai public.
router.post("/zalopay/callback", payment.handleZaloPayCallback);

router.patch(
  "/order/:orderId/confirm-bank",
  verifyToken,
  authorizeRoles("ADMIN", "MANAGER", "STAFF"),
  payment.confirmBankTransferPayment
);

module.exports = router;