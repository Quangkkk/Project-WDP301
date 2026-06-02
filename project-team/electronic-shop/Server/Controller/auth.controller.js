const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../Model/User.model");
const Role = require("../Model/Roles.model");
const { sendVerificationEmail } = require("../utils/email.utils");

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const customerRole = await Role.findOne({ code: "customer" });

    if (!customerRole) {
      return res.status(500).json({
        success: false,
        message: "Customer role not found. Please seed roles first.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      roleId: customerRole._id,
      status: "pending",
      emailVerified: false,
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendVerificationEmail(email, verificationCode);

    return res.status(201).json({
      success: true,
      message: "Register successfully. Please check your email to verify your account.",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Register failed",
      error: error.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
      });
    }

    user.emailVerified = true;
    user.status = "active";
    user.verificationCode = null;
    user.verificationCodeExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can login now.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Verify email failed",
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

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const verificationCode = generateVerificationCode();

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await sendVerificationEmail(email, verificationCode);

    return res.status(200).json({
      success: true,
      message: "Verification code has been resent",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Resend verification code failed",
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

    const user = await User.findOne({ email }).populate("roleId", "name code");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user._id,
        roleId: user.roleId._id,
        role: user.roleId.code,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successfully",
      accessToken,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.roleId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
};