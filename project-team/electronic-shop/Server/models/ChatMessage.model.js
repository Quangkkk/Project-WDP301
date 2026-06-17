const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation_id: 1 });
chatMessageSchema.index({ sender_id: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);