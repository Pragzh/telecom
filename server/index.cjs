require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const OpenAI = require("openai");
const fs = require("fs");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const http = require("http");

const { Server } = require("socket.io"); 

const multer = require("multer");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const { authenticate, authorize } = require("./middleware/authMiddleware");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Customer = require("./models/Customer");
const Conversation = require("./models/Conversation");
const Ticket = require("./models/Ticket");
const Payment = require("./models/Payment");
let conversations = [];
let tickets = [];
let payments = [];
const app = express();

const path = require("path");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
    }
  },
});
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
app.set("trust proxy", 1);
app.use(express.json({ limit: "20mb" }));

app.use(cookieParser());
// Security headers
app.use(helmet());

// Rate limit all API routes
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: { message: "Too many requests, please try again later." }
}));

// Stricter limit on login specifically
app.use("/api/admin/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                   // only 10 login attempts per 15 min
  message: { message: "Too many login attempts, please try again later." }
}));
app.use("/api/admin", authRoutes);

if (process.env.MONGO_URI?.startsWith("mongodb")) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((error) => console.log("MongoDB error:", error));
} else {
  console.log("MongoDB not connected yet. Add real MONGO_URI later.");
}

app.get("/", (req, res) => {
  res.send("Telecom Chatbot Backend Running");
});

app.post("/api/customer/identify", async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.replace(/\s/g, "");

    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    let customer = await Customer.findOne({ phone: cleanPhone });

    if (!customer) {
      customer = await Customer.create({
        crmId: "CRM-" + Date.now(),
        name: "Demo Customer",
        phone: cleanPhone,
        plan: "Basic 30 Mbps",
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.log("Customer identify error:", error);
    res.status(500).json({
      success: false,
      message: "Customer identification failed",
    });
  }
});

app.post("/api/conversations", async (req, res) => {
  try {
    const conversation = await Conversation.create({
      id: "CONV-" + Date.now(),
      ...req.body,
    });

    io.emit("new_conversation", conversation);

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.log("Create conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Conversation not saved",
    });
  }
});

app.get("/api/conversations", async (req, res) => {
  const conversations = await Conversation.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    conversations,
  });
});


app.put("/api/conversations/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        $or: [{ id }, mongoose.Types.ObjectId.isValid(id) ? { _id: id } : null].filter(Boolean),
      },
      { status },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    io.emit("conversation_updated", conversation);
    io.emit("new_message", {
      conversationId: conversation.id || conversation._id,
      crmId: conversation.crmId,
      status: conversation.status,
    });

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.log("Conversation status update error:", error);

    res.status(500).json({
      success: false,
      message: "Could not update conversation status",
    });
  }
});

app.post(
  "/api/conversations/:id/reply",
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { text, adminName } = req.body;

      if (!text && !req.file) {
        return res.status(400).json({
          success: false,
          message: "Reply text or attachment is required",
        });
      }

      const newMessage = {
        from: "admin",
        text: text || "",
        adminName,
        createdAt: new Date(),
      };

      if (req.file) {
        newMessage.attachmentUrl = `/uploads/${req.file.filename}`;
        newMessage.attachmentType = req.file.mimetype;
        newMessage.attachmentName = req.file.originalname;
      }

      const conversation = await Conversation.findOneAndUpdate(
        {
          $or: [{ id }, { _id: id }],
        },
        {
          $push: {
            messages: newMessage,
          },
        },
        {
          new: true,
        }
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      io.emit("admin_reply", {
        conversationId: conversation.id || conversation._id,
        crmId: conversation.crmId,
        message: newMessage,
      });

      io.emit("new_message", {
        conversationId: conversation.id || conversation._id,
        message: newMessage,
      });

      res.json({
        success: true,
        conversation,
      });
    } catch (error) {
      console.log("Admin reply error:", error);

      res.status(500).json({
        success: false,
        message: "Admin reply failed",
      });
    }
  }
);

app.get("/api/conversations/customer/:crmId", async (req, res) => {
  try {
    const conversations = await Conversation.find({
      crmId: req.params.crmId,
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load customer conversations",
    });
  }
});

app.post("/api/tickets", async (req, res) => {
  try {
    const ticket = await Ticket.create({
      ticketId: "TKT-" + Math.floor(1000 + Math.random() * 9000),
      crmId: req.body.crmId,
      phone: req.body.phone,
      category: req.body.category,
      priority: "High",
      status: "Open",
    });

    io.emit("new_ticket", ticket);

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.log("Create ticket error:", error);

    res.status(500).json({
      success: false,
      message: "Ticket not created",
    });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.log("Get tickets error:", error);

    res.status(500).json({
      success: false,
      tickets: [],
    });
  }
});

app.put("/api/tickets/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const message = {
      from: "admin",
      adminName: "Tech Support",
      text: `✅ Your issue has been marked as resolved.\nTicket ID: ${ticket.ticketId}`,
      createdAt: new Date(),
    };

    const conversation = await Conversation.create({
      id: "CONV-" + Date.now(),
      crmId: ticket.crmId,
      name: "Customer",
      phone: ticket.phone,
      category: "Ticket Update",
      assignedTo: "tech",
      status: "closed",
      messages: [message],
    });

    io.emit("ticket_updated", ticket);

    io.emit("admin_reply", {
      conversationId: conversation.id,
      crmId: ticket.crmId,
      message,
    });

    io.emit("new_conversation", conversation);

    res.json({
      success: true,
      ticket,
      conversation,
    });
  } catch (error) {
    console.log("Ticket status update error:", error);

    res.status(500).json({
      success: false,
      message: "Ticket status update failed",
    });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const payment = await Payment.create({
      paymentId: "PV-" + Math.floor(1000 + Math.random() * 9000),
      ...req.body,
      status: "pending",
    });

    io.emit("new_payment", payment);

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.log("Create payment error:", error);
    res.status(500).json({
      success: false,
      message: "Payment not saved",
    });
  }
});

app.get("/api/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.log("Get payments error:", error);
    res.status(500).json({
      success: false,
      payments: [],
    });
  }
});

app.put("/api/payments/:id/status", async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status, remarks },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const message =
      status === "verified"
        ? {
            from: "admin",
            adminName: "Billing Admin",
            text: `✅ Your payment has been verified successfully.\nPayment ID: ${payment.paymentId}`,
            createdAt: new Date(),
          }
        : {
            from: "admin",
            adminName: "Billing Admin",
            text: `❌ Your payment could not be verified.\nPayment ID: ${payment.paymentId}${
              remarks ? `\nRemarks: ${remarks}` : ""
            }`,
            createdAt: new Date(),
          };

    const conversation = await Conversation.create({
      id: "CONV-" + Date.now(),
      crmId: payment.crmId,
      name: "Customer",
      phone: payment.phone,
      category: "Payment Verification",
      assignedTo: "billing",
      status: "closed",
      messages: [message],
    });

    io.emit("payment_updated", payment);

    io.emit("admin_reply", {
      conversationId: conversation.id,
      crmId: payment.crmId,
      message,
    });

    io.emit("new_conversation", conversation);

    res.json({
      success: true,
      payment,
      conversation,
    });
  } catch (error) {
    console.log("Payment status update error:", error);

    res.status(500).json({
      success: false,
      message: "Payment status update failed",
    });
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log("Joined room:", conversationId);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.post("/api/ai/scan-image", upload.single("image"), async (req, res) => {
  try {
    const { crmId, phone } = req.body;
 
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }
 
    // Read image as base64
    const base64Image = fs.readFileSync(req.file.path).toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";
 
    // Ask GPT-4o-mini to analyze
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are a telecom support assistant. Analyze the image and respond ONLY in this JSON format (no extra text, no markdown):
IMPORTANT: Before analyzing, automatically redact any personal information visible in the image (names, phone numbers, email addresses, account numbers, addresses). Do not include any personal data in your response.

If it is a payment screenshot (UPI, bank transfer, PhonePe, GPay, Paytm, Razorpay, etc.):
{
  "type": "payment",
  "utr": "<transaction/UTR/reference ID or null>",
  "amount": "<amount with currency or null>",
  "date": "<date as shown or null>",
  "bank": "<payment app or bank name or null>",
  "status": "<Success or Failed or Pending>"
}

If it is any other image (router, device, error screen, cable, etc.):
{
  "type": "other",
  "solution": "<numbered steps only, no problem description, no device info, just actionable fix steps, max 4 steps, each step one line>"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            { type: "text", text: "Analyze this image." },
          ],
        },
      ],
    });
 
    // Parse AI JSON response
    let aiData;
    try {
      const raw = response.choices[0].message.content.trim();
      aiData = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch (e) {
      return res.status(500).json({ success: false, message: "AI response parsing failed" });
    }
 
    // --- PAYMENT IMAGE ---
    if (aiData.type === "payment") {
      const payment = await Payment.create({
        paymentId: "PV-" + Math.floor(1000 + Math.random() * 9000),
        crmId,
        phone,
        utr: aiData.utr || "Not detected",
        amount: aiData.amount || "Not detected",
        date: aiData.date || "Not detected",
        bank: aiData.bank || "Not detected",
        imageUrl: `/uploads/${req.file.filename}`,
        status: "pending",
      });
 
      io.emit("new_payment", payment);
 
      return res.json({
        success: true,
        type: "payment",
        reply: `Thank you for your payment! 🙏\n\nWe have received your payment screenshot and it has been forwarded to our billing team for verification. You will be notified once it is confirmed.`,
        payment,
      });
    }
 
    // --- ANY OTHER IMAGE ---
   // --- ANY OTHER IMAGE ---
// --- ANY OTHER IMAGE ---
const uploadedMessage = {
  from: "user",
  text: `Uploaded image: ${req.file.originalname}`,
  attachmentUrl: `/uploads/${req.file.filename}`,
  attachmentType: req.file.mimetype,
  attachmentName: req.file.originalname,
  createdAt: new Date(),
};

const botMessage = {
  from: "bot",
  text:
    (aiData.solution || "Please check your device and try restarting it.") +
    "\n\nIs your issue resolved? Reply *YES* or *NO*",
  createdAt: new Date(),
};

const conversation = await Conversation.create({
  id: "CONV-" + Date.now(),
  crmId,
  phone,
  name: "Customer",
  category: "Image Support",
  assignedTo: "tech",
  status: "assigned",
  messages: [uploadedMessage, botMessage],
});

io.emit("new_conversation", conversation);

return res.json({
  success: true,
  type: "other",
  reply: botMessage.text,
  conversation,
});
 
  } catch (error) {
    console.log("AI scan error:", error);
    res.status(500).json({ success: false, message: "Image scan failed. Please try again." });
  }
});



// Centralized error handler — no stack traces in production
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});