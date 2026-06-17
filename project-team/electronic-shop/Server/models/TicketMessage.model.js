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
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

ticketMessageSchema.index({ ticket_id: 1 });

module.exports = mongoose.model("TicketMessage", ticketMessageSchema);