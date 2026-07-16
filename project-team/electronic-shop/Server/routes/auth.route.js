const express = require("express");
const authController = require("../Controller/auth.controller");

const router = express.Router();

router.post("/register", authController.register);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification-code", authController.resendVerificationCode);
router.post("/resend-otp", authController.resendVerificationCode);
router.post("/login", authController.login);

module.exports = router;