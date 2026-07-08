const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User.model");
const Role = require("../models/Roles.model");

const safeSelect = "-hash_pass -__v";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
      name: "Customer",
      description: "Default customer role",
    });
  }

  return role;
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone, img_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existedUser = await User.findOne({ email: normalizedEmail });

    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
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
      status: "unverified",
    });

    const data = await User.findById(user._id)
      .select(safeSelect)
      .populate("role_id", "name code");

    return res.status(201).json({
      success: true,
      message: "Register successfully. Account status is unverified.",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to register",
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
        message: "email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).populate(
      "role_id",
      "name code"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.hash_pass);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Account has been blocked",
      });
    }

    if (user.status === "unverified") {
      return res.status(403).json({
        success: false,
        message: "Account has not been verified",
      });
    }

    const token = buildToken(user, user.role_id);

    const data = await User.findById(user._id)
      .select(safeSelect)
      .populate("role_id", "name code");

    return res.status(200).json({
      success: true,
      message: "Login successfully",
      token,
      accessToken: token,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login",
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
          message: "Invalid user_id",
        });
      }

      filter._id = user_id;
    } else if (email) {
      filter.email = email.toLowerCase().trim();
    } else {
      return res.status(400).json({
        success: false,
        message: "email or user_id is required",
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
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verify email successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify email",
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
        message: "email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.status === "active") {
      return res.status(200).json({
        success: true,
        message: "Account is already active",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "No verification code is stored. Use /auth/verify-email to set status to active.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to resend verification code",
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