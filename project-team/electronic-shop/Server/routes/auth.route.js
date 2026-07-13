const express = require("express");
const authController = require("../controller/auth.controller");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification-code", authController.resendVerificationCode);

module.exports = router;