const mongoose = require("mongoose");

const userAddressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver_name: {
      type: String,
      required: true,
      trim: true,
    },

    receiver_phone: {
      type: String,
      required: true,
      trim: true,
    },

    province: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    ward: {
      type: String,
      required: true,
      trim: true,
    },

    address_line: {
      type: String,
      required: true,
      trim: true,
    },

    is_default: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userAddressSchema.index({ user_id: 1 });

module.exports = mongoose.model(
  "UserAddress",
  userAddressSchema
);