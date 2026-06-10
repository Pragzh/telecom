const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    crmId: String,
    name: String,
    phone: String,
    category: String,
    assignedTo: String,
    status: {
      type: String,
      default: "open",
    },
    messages: [
      {
        from: String,
        text: String,
        imageUrl: String,
         attachmentUrl: String,
    attachmentType: String,
    attachmentName: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);