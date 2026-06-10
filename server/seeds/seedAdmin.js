/**
 * Creates your first super admin.
 * Run once: node seeds/seedAdmin.js
 *
 * Make sure MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET are set in .env
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const admins = [
  { name: "Super Admin", email: "super@telecom.com", password: "SuperAdmin@123", role: "super" },
  { name: "Billing Admin", email: "billing@telecom.com", password: "Billing@123", role: "billing" },
  { name: "Tech Support", email: "tech@telecom.com", password: "TechSupport@123", role: "tech" },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  for (const data of admins) {
    const exists = await Admin.findOne({ email: data.email });
    if (exists) {
      console.log(`⚠️  Already exists: ${data.email}`);
      continue;
    }
    await Admin.create(data);
    console.log(`✅ Created [${data.role}]: ${data.email} / ${data.password}`);
  }

  console.log("\n⚠️  Change all passwords immediately after first login!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});