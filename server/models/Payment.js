const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: String,
    crmId: String,
    phone: String,
    utr: String,
    amount: String,
    date: String,
    bank: String,

    imageUrl: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);