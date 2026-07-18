const express = require("express");
const payment = require("../Controller/payment.controller");

const router = express.Router();

router.get("/order/:orderId", payment.getPaymentByOrder);
router.post("/bank-transfer", payment.createBankTransferPayment);
router.post("/zalopay/create", payment.createZaloPayPayment);
router.post("/zalopay/callback", payment.handleZaloPayCallback);
router.patch("/order/:orderId/confirm-bank", payment.confirmBankTransferPayment);

module.exports = router;