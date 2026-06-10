require("dotenv").config();
const mongoose = require("mongoose");

const createIndexes = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");

  const db = mongoose.connection.db;

  await db.collection("customers").createIndex({ phone: 1 }, { unique: true });
  await db.collection("customers").createIndex({ crmId: 1 });
  await db.collection("conversations").createIndex({ customerId: 1 });
  await db.collection("conversations").createIndex({ status: 1 });
  await db.collection("tickets").createIndex({ customerId: 1 });
  await db.collection("payments").createIndex({ customerId: 1 });
  await db.collection("admins").createIndex({ email: 1 }, { unique: true });

  console.log("✅ All indexes created");
  process.exit(0);
};

createIndexes().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});