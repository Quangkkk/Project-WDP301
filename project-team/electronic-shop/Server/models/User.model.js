const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
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

    hash_pass: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    img_url: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["unverified", "active", "blocked"],
      default: "unverified",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);