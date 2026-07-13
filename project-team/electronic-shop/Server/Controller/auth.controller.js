const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const crypto = require("crypto");

const User = require("../models/User.model");
const Role = require("../models/Roles.model");
const {
  sendForgotPasswordEmail,
  sendResetSuccessEmail,
} = require("../mailtrap/email");

const safeSelect =
  "-hash_pass -reset_password_token -reset_password_expires -__v";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getClientBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
};

const buildToken = (user, role) => {
  return jwt.sign(
    {
      user_id: user._id,
      role_id: user.role_id,
      role: role?.code ? role.code.toUpperCase() : undefined,
    },
    process.env.JWT_SECRET || "dev_secret_key",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const getCustomerRole = async () => {
  let role = await Role.findOne({ code: "customer" });

  if (!role) {
    role = await Role.create({
      code: "customer",
      name: "Khách hàng",
      description: "Vai trò mặc định của khách hàng",
    });
  }

  return role;
};

const normalizeEmail = (email) => {
  return String(email || "").toLowerCase().trim();
};

const hashResetToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone, img_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existedUser = await User.findOne({ email: normalizedEmail });

    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng.",
      });
    }

    const role = await getCustomerRole();
    const hash_pass = await bcrypt.hash(password, 10);

    const user = await User.create({
      role_id: role._id,
      name,
      email: normalizedEmail,
      hash_pass,
      phone: phone || null,
      img_url: img_url || null,
      status: "active",
    });

    const data = await User.findById(user._id)
      .select(safeSelect)
      .populate("role_id", "name code");

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Đăng ký thất bại.",
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
        message: "Vui lòng nhập email và mật khẩu.",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).populate(
      "role_id",
      "name code"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.hash_pass);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa.",
      });
    }

    if (user.status === "unverified") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản chưa được xác thực.",
      });
    }

    const token = buildToken(user, user.role_id);

    const data = await User.findById(user._id)
      .select(safeSelect)
      .populate("role_id", "name code");

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công.",
      token,
      accessToken: token,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Đăng nhập thất bại.",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email.",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    const genericMessage =
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashResetToken(rawToken);

    user.reset_password_token = hashedToken;
    user.reset_password_expires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetURL = `${getClientBaseUrl()}/reset-password/${rawToken}`;

    let mailSent = true;

    try {
      await sendForgotPasswordEmail(user.email, resetURL);
    } catch (error) {
      mailSent = false;
      console.error("Send forgot password email failed:", error.message);
    }

    const data =
      process.env.NODE_ENV === "production"
        ? {
            mail_sent: mailSent,
          }
        : {
            mail_sent: mailSent,
            reset_url: resetURL,
          };

    return res.status(200).json({
      success: true,
      message: genericMessage,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không gửi được yêu cầu đặt lại mật khẩu.",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirm_password, confirmPassword } = req.body;

    const finalConfirmPassword = confirm_password || confirmPassword;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã đặt lại mật khẩu.",
      });
    }

    if (!password || !finalConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự.",
      });
    }

    if (password !== finalConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp.",
      });
    }

    const hashedToken = hashResetToken(token);

    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      });
    }

    user.hash_pass = await bcrypt.hash(password, 10);
    user.reset_password_token = null;
    user.reset_password_expires = null;

    if (user.status === "unverified") {
      user.status = "active";
    }

    await user.save();

    try {
      await sendResetSuccessEmail(user.email);
    } catch (error) {
      console.error("Send reset success email failed:", error.message);
    }

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không đặt lại được mật khẩu.",
      error: error.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, user_id } = req.body;

    const filter = {};

    if (user_id) {
      if (!isValidObjectId(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Mã người dùng không hợp lệ.",
        });
      }

      filter._id = user_id;
    } else if (email) {
      filter.email = normalizeEmail(email);
    } else {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email hoặc mã người dùng.",
      });
    }

    const user = await User.findOneAndUpdate(
      filter,
      {
        status: "active",
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select(safeSelect)
      .populate("role_id", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xác thực tài khoản thành công.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Xác thực tài khoản thất bại.",
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
        message: "Vui lòng nhập email.",
      });
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    if (user.status === "active") {
      return res.status(200).json({
        success: true,
        message: "Tài khoản đã được kích hoạt.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã gửi lại yêu cầu xác thực tài khoản.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không gửi lại được yêu cầu xác thực.",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationCode,
};