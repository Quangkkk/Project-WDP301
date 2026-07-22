const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assigned_staff_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    category: {
      type: String,
      default: "general",
      trim: true,
    },
    status: {
      type: String,
      default: "open",
      trim: true,
    },
    closed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

supportTicketSchema.index({ user_id: 1 });
supportTicketSchema.index({ assigned_staff_id: 1 });
supportTicketSchema.index({ order_id: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema, "support_tickets");
