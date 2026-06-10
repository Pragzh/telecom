const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { authenticate } = require("../middleware/authMiddleware");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const admin = await Admin.findOne({ email }).select("+password +refreshTokens");

    if (!admin || !admin.isActive)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const payload = { id: admin._id, email: admin.email, role: admin.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

    admin.refreshTokens.push(refreshToken);
    if (admin.refreshTokens.length > 5)
      admin.refreshTokens = admin.refreshTokens.slice(-5);
    admin.lastLogin = new Date();
    await admin.save();

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      token: accessToken, // kept as "token" to match your existing AdminLogin.jsx
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/refresh
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const admin = await Admin.findById(decoded.id).select("+refreshTokens");

    if (!admin || !admin.refreshTokens.includes(token)) {
      if (admin) { admin.refreshTokens = []; await admin.save(); }
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    // Rotate token
    admin.refreshTokens = admin.refreshTokens.filter((t) => t !== token);
    const payload = { id: admin._id, email: admin.email, role: admin.role };
    const newAccessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
    const newRefreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

    admin.refreshTokens.push(newRefreshToken);
    await admin.save();

    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);
    return res.status(200).json({ token: newAccessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    const admin = await Admin.findById(req.admin.id).select("+refreshTokens");
    if (admin && token) {
      admin.refreshTokens = admin.refreshTokens.filter((t) => t !== token);
      await admin.save();
    }
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.status(200).json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: admin.lastLogin,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;