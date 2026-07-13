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
      required: true,
    },
    status: {
      type: String,
      default: "open",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

chatConversationSchema.index({ customer_id: 1 });
chatConversationSchema.index({ staff_id: 1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema, "chat_conversations");
