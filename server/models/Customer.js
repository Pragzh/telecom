const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    crmId: String,
    plan: String,
    isRegistered: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);