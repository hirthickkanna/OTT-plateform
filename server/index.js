import "./config/env.js";
import cors from "cors";
import express from "express";
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
import { startMediaServer } from "./services/mediaServer.js";

import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
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

app.use(errorHandler);

await connectDB();
await ensureDevSeed();
startMediaServer();

const server = app.listen(PORT, "0.0.0.0", () => console.log(`API http://127.0.0.1:${PORT}`));
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process, then restart.`);
    console.error(`Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F`);
    process.exit(1);
  }
  throw err;
});
