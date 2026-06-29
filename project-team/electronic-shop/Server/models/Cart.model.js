const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    session_id: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

cartSchema.index({ user_id: 1 });
cartSchema.index({ session_id: 1 });

module.exports = mongoose.model("Cart", cartSchema, "carts");
