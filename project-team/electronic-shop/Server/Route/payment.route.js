const express = require("express")
const router = express.Router();
const  paymentController  = require("./../Controller/payment.controller");
// const validate = require("../middleware/validateUser.middleware")

router.post("/create-payment-link", paymentController.createPayment)   

router.post("/receive-hook", paymentController.webHook)


module.exports = router;
