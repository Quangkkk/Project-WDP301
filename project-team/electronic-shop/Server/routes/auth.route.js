const express =
  require("express");

const authController =
  require(
    "../Controller/auth.controller"
  );

const rateLimiter =
  require(
    "../middleware/rateLimiter"
  );

const router =
  express.Router();

router.post(
  "/register",
  authController.register,
);

router.post(
  "/verify-email",
  authController.verifyEmail,
);

router.post(
  "/resend-verification-code",
  authController
    .resendVerificationCode,
);

router.post(
  "/resend-otp",
  authController
    .resendVerificationCode,
);

router.post(
  "/login",
  authController.login,
);

/*
 * Quên mật khẩu bằng OTP Gmail.
 */
router.post(
  "/forgot-password",
  rateLimiter,
  authController.forgotPassword,
);

router.post(
  "/verify-reset-otp",
  rateLimiter,
  authController.verifyResetOtp,
);

router.post(
  "/resend-reset-otp",
  rateLimiter,
  authController.resendResetOtp,
);

router.post(
  "/reset-password",
  rateLimiter,
  authController.resetPassword,
);

module.exports = router;