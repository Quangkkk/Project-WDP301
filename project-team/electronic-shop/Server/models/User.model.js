const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    date_of_birth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null,
      trim: true,
      lowercase: true,
    },
    img_url: {
      type: String,
      default: null,
      trim: true,
    },
    hash_pass: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "active",
      trim: true,
    },
    email_otp: {
      type: String,
      default: null,
      trim: true,
    },
    email_otp_expires: {
      type: Date,
      default: null,
    },
    reset_password_token: {
      type: String,
      default: null,
      index: true,
    },
    reset_password_expires: {
      type: Date,
      default: null,
    },
    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

userSchema.index({ phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema, "users");