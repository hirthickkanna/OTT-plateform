import "./config/env.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { connectDB } from "./config/db.js";
import { ensureDevSeed } from "./config/devSeed.js";
import { errorHandler } from "./middleware/errorHandler.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import creatorRoutes from "./routes/creator.routes.js";
import drmRoutes from "./routes/drm.routes.js";
import liveRoutes from "./routes/live.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import streamingRoutes from "./routes/streaming.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import videoRoutes from "./routes/video.routes.js";
import downloadRoutes from "./routes/download.routes.js";
import { startMediaServer } from "./services/mediaServer.js";

import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Security Headers (LOW-2) ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow media files to be served
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
}));

// ── CORS (HIGH-2) — read comma-separated CORS_ORIGINS from env ────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true, // required for httpOnly cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Cookie parser (LOW-1) ─────────────────────────────────────────────────────
app.use(cookieParser());

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// Serve locally uploaded video files and poster images
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

// Serve transcoded HLS streams statically
const TRANSCODE_DIR = path.resolve(__dirname, "../transcoded");
if (!fs.existsSync(TRANSCODE_DIR)) fs.mkdirSync(TRANSCODE_DIR, { recursive: true });
app.use("/vod", express.static(TRANSCODE_DIR));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/streaming", streamingRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/drm", drmRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/downloads", downloadRoutes);

app.use(errorHandler);

// ── NEW-MED-1: Startup secrets validation ─────────────────────────────────────
// Fail loudly in production if critical secrets are missing or insecure.
// This prevents the silent "dev-secret" fallback from ever reaching production.
if (process.env.NODE_ENV === "production") {
  const missingSecrets = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret" || process.env.JWT_SECRET.length < 32) {
    missingSecrets.push("JWT_SECRET (must be 32+ chars, not 'dev-secret')");
  }
  if (!process.env.MONGODB_URI) {
    missingSecrets.push("MONGODB_URI");
  }
  if (missingSecrets.length > 0) {
    console.error("[SECURITY] Missing or insecure production secrets:");
    missingSecrets.forEach((s) => console.error(`  - ${s}`));
    process.exit(1);
  }
}

await connectDB();
await ensureDevSeed();
startMediaServer();

// ── LOW-3: Bind to localhost in dev, all interfaces in production ──────────────
const bindHost = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
const server = app.listen(PORT, bindHost, () => console.log(`API http://${bindHost}:${PORT}`));
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process, then restart.`);
    console.error(`Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F`);
    process.exit(1);
  }
  throw err;
});
