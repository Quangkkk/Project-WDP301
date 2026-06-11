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
      unique: true,
      sparse: true,
      trim: true,
      default: null,
    },

    img_url: {
      type: String,
      trim: true,
      default: null,
    },

    hash_pass: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "inactive",
        "blocked",
        "banned",
      ],
      default: "pending",
    },

    email_verified: {
      type: Boolean,
      default: false,
    },

    verification_code: {
      type: String,
      default: null,
    },

    verification_code_expires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);