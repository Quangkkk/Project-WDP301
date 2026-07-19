const express = require("express");
const payment = require(
  "../Controller/payment.controller"
);
const verifyToken = require(
  "../middleware/verifyToken"
);
const authorizeRoles = require(
  "../middleware/authorizeRoles"
);

const router = express.Router();

// User xem thanh toan cua don minh.
// Admin/Manager/Staff duoc service cho phep xem don quan ly.
router.get(
  "/order/:orderId",
  verifyToken,
  payment.getPaymentByOrder
);

router.post(
  "/bank-transfer",
  verifyToken,
  payment.createBankTransferPayment
);

router.post(
  "/zalopay/create",
  verifyToken,
  payment.createZaloPayPayment
);

// Callback phai public de ZaloPay goi vao
router.post(
  "/zalopay/callback",
  payment.handleZaloPayCallback
);

// Chi nhan vien quan tri duoc confirm thu cong
router.patch(
  "/order/:orderId/confirm-bank",
  verifyToken,
  authorizeRoles(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  payment.confirmBankTransferPayment
);

module.exports = router;