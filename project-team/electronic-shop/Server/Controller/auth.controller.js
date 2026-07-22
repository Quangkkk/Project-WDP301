const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User.model");
const authService = require("../services/auth.service");
const {
  sendForgotPasswordEmail,
  sendResetSuccessEmail,
} = require("../mailtrap/email");

const passwordResetService =
  require(
    "../services/passwordReset.service"
  );

const safeSelect =
  "-hash_pass -email_otp -email_otp_expires -reset_password_token -reset_password_expires -__v";

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getClientBaseUrl = () =>
  (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");

const register = async (req, res) => {
  try {
    const { name, email, password, phone, img_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const data = await authService.register({
      name,
      email,
      password,
      phone,
      img_url,
    });

    return res.status(201).json({
      success: true,
      message: "Register successfully. Please verify your email.",
      data,
    });
  } catch (error) {
    const statusCode = error.message === "Email already exists" ? 409 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to register",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const { token, data } = await authService.login({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successfully",
      token,
      accessToken: token,
      data,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message === "Invalid email or password") statusCode = 401;
    if (
      error.message === "Account has been blocked" ||
      error.message === "Account has not been verified"
    ) {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to login",
      error: error.message,
    });
  }
};
const forgotPassword = async (
  req,
  res,
) => {
  try {
    const data =
      await passwordResetService.requestOtp(
        req.body?.email,
      );

    return res.status(200).json({
      success: true,

      message:
        "Mã OTP đã được gửi tới Gmail của bạn.",

      data,
    });
  } catch (error) {
    return res
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success: false,

        message:
          error.message ||
          "Không gửi được mã OTP.",

        error:
          error.message,
      });
  }
};

const resendResetOtp = async (
  req,
  res,
) => {
  try {
    const data =
      await passwordResetService.requestOtp(
        req.body?.email,
      );

    return res.status(200).json({
      success: true,

      message:
        "Mã OTP mới đã được gửi tới Gmail của bạn.",

      data,
    });
  } catch (error) {
    return res
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success: false,

        message:
          error.message ||
          "Không gửi lại được mã OTP.",

        error:
          error.message,
      });
  }
};

const verifyResetOtp = async (
  req,
  res,
) => {
  try {
    const data =
      await passwordResetService.verifyOtp(
        {
          email:
            req.body?.email,

          otp:
            req.body?.otp,
        },
      );

    return res.status(200).json({
      success: true,

      message:
        "Xác thực OTP thành công.",

      data,
    });
  } catch (error) {
    return res
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success: false,

        message:
          error.message ||
          "Không xác thực được OTP.",

        error:
          error.message,
      });
  }
};

const resetPassword = async (
  req,
  res,
) => {
  try {
    await passwordResetService.changePassword(
      {
        email:
          req.body?.email,

        resetToken:
          req.body
            ?.reset_token ||
          req.body
            ?.resetToken,

        password:
          req.body?.password,

        confirmPassword:
          req.body
            ?.confirm_password ||
          req.body
            ?.confirmPassword,
      },
    );

    return res.status(200).json({
      success: true,

      message:
        "Đặt lại mật khẩu thành công.",
    });
  } catch (error) {
    return res
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success: false,

        message:
          error.message ||
          "Không đặt lại được mật khẩu.",

        error:
          error.message,
      });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const data = await authService.verifyEmail({ email, otp: String(otp) });

    return res.status(200).json({
      success: true,
      message: "Verify email successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") statusCode = 404;
    if (
      error.message.includes("Invalid or expired") ||
      error.message.includes("required")
    ) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to verify email",
      error: error.message,
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const message = await authService.resendVerificationCode(email);

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    const statusCode = error.message === "User not found" ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to resend verification code",
      error: error.message,
    });
  }
};
module.exports = {
  register,
  login,

  forgotPassword,
  resendResetOtp,
  verifyResetOtp,
  resetPassword,

  verifyEmail,
  resendVerificationCode,
};