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
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

brandSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Brand", brandSchema);