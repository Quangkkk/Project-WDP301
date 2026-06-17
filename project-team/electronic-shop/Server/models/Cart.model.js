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
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

cartSchema.index({ user_id: 1 });
cartSchema.index({ session_id: 1 });

module.exports = mongoose.model("Cart", cartSchema);