const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    staff_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "pending", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ customer_id: 1 });
chatConversationSchema.index({ staff_id: 1 });

module.exports = mongoose.model(
  "ChatConversation",
  chatConversationSchema
);