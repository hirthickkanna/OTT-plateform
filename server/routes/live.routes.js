import { Router } from "express";
import { body, validationResult } from "express-validator";
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

      const channel = await LiveChannel.create({
        creatorId: req.user.id,
        title: req.body.title,
        isActive: true,
        hlsUrl: process.env.NODE_ENV === "production" 
          ? `${cdn()}/live/placeholder/master.m3u8`
          : "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
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
    channel.hlsUrl = `${cdn()}/live/${channel._id}/master.m3u8`;
    await channel.save();
    res.json(channel);
  } catch (e) {
    next(e);
  }
});

export default router;
