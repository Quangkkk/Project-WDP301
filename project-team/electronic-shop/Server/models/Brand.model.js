const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo_img: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      default: "active",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

brandSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Brand", brandSchema, "brands");
