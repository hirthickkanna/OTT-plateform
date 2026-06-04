import { Router } from "express";
import { body, validationResult } from "express-validator";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { LiveChannel } from "../models/LiveChannel.js";

const router = Router();
const cdn = () => process.env.CDN_BASE_URL || "";

router.get("/", async (_req, res, next) => {
  try {
    const channels = await LiveChannel.find({ isActive: true }).select("title hlsUrl creatorId");
    res.json(channels);
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  requireAuth,
  body("title").notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);

      const streamKey = crypto.randomBytes(16).toString("hex");
      const hlsUrl = process.env.NODE_ENV === "production"
        ? `${cdn()}/live/${streamKey}/index.m3u8`
        : `${process.env.API_URL || "http://localhost:5001"}/uploads/live/live/${streamKey}/index.m3u8`;

      const channel = await LiveChannel.create({
        creatorId: req.user.id,
        title: req.body.title,
        isActive: true,
        streamKey,
        hlsUrl,
        youtubeStreamKey: req.body.youtubeStreamKey || "",
      });

      res.status(201).json({
        ...channel.toObject(),
        ingestUrl: process.env.LIVE_INGEST_URL || "rtmp://localhost:1935/live",
      });
    } catch (e) {
      next(e);
    }
  },
);

router.patch("/:id/start", requireAuth, async (req, res, next) => {
  try {
    const channel = await LiveChannel.findById(req.params.id);
    if (!channel || channel.creatorId.toString() !== req.user.id) {
      throw new AppError("Not found", 404);
    }
    channel.isActive = true;
    channel.startedAt = new Date();
    channel.hlsUrl = process.env.NODE_ENV === "production"
      ? `${cdn()}/live/${channel.streamKey}/index.m3u8`
      : `${process.env.API_URL || "http://localhost:5001"}/uploads/live/live/${channel.streamKey}/index.m3u8`;
    await channel.save();
    res.json(channel);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const channel = await LiveChannel.findById(req.params.id);
    if (!channel) {
      throw new AppError("Channel not found", 404);
    }
    if (channel.creatorId.toString() !== req.user.id) {
      throw new AppError("Not authorized to delete this channel", 403);
    }
    await LiveChannel.deleteOne({ _id: req.params.id });
    res.json({ ok: true, message: "Channel deleted successfully" });
  } catch (e) {
    next(e);
  }
});

export default router;
