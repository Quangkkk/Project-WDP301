const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
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
      type: [
        {
          original_name: String,
          filename: String,
          mime_type: String,
          size: Number,
          url: String,
          type: { type: String, enum: ["image", "file"], default: "file" },
        }
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  }
);

ticketMessageSchema.index({ ticket_id: 1 });
ticketMessageSchema.index({ sender_id: 1 });

module.exports = mongoose.model("TicketMessage", ticketMessageSchema, "ticket_messages");
