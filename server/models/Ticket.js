const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: String,
    crmId: String,
    phone: String,
    category: String,
    priority: String,
    status: {
      type: String,
      default: "Open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);