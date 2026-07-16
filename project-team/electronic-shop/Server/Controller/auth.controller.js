const mongoose = require("mongoose");
const authService = require("../services/auth.service");

// Helper check ObjectId hop le
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller dang ky tai khoan
const register = async (req, res) => {
  try {
    const { name, email, password, phone, img_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    const data = await authService.register({ name, email, password, phone, img_url });

    return res.status(201).json({
      success: true,
      message: "Register successfully. Account status is unverified.",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Email already exists") {
      statusCode = 409;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to register",
      error: error.message,
    });
  }
};

// Controller dang nhap
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const { token, data } = await authService.login({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successfully",
      token,
      accessToken: token, // Truong hop client dung accessToken
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Invalid email or password") {
      statusCode = 401;
    } else if (error.message === "Account has been blocked" || error.message === "Account has not been verified") {
      statusCode = 403;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to login",
      error: error.message,
    });
  }
};

// Controller xac thuc email
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const user = await authService.verifyEmail({ email, otp });

    return res.status(200).json({
      success: true,
      message: "Verify email successfully",
      data: user,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    } else if (error.message.includes("Invalid or expired") || error.message.includes("required")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to verify email",
      error: error.message,
    });
  }
};

// Controller gui lai ma xac nhan
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const message = await authService.resendVerificationCode(email);

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found") {
      statusCode = 404;
    }
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
  verifyEmail,
  resendVerificationCode,
};