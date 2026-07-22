const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    original_name: {
      type: String,
      default: "",
    },
    filename: {
      type: String,
      default: "",
    },
    mime_type: {
      type: String,
      default: "",
    },
    size: {
      type: Number,
      default: 0,
    },
    url: {
      type: String,
      default: "",
    },
    public_id: {
      type: String,
      default: "",
    },
    resource_type: {
      type: String,
      default: "",
    },
    format: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      default: "cloudinary",
    },
    type: {
      type: String,
      enum: ["image", "file"],
      default: "file",
    },
  },
  {
    _id: false,
  }
);

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
    message: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

chatMessageSchema.index({ conversation_id: 1 });
chatMessageSchema.index({ sender_id: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema, "chat_messages");
