import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Video } from "../models/Video.js";
import { WatchHistory } from "../models/WatchHistory.js";

const router = Router();

router.post(
  "/progress",
  requireAuth,
  body("videoId").notEmpty(),
  body("progressSec").isInt({ min: 0 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);

      const { videoId, progressSec, completed } = req.body;
      const entry = await WatchHistory.findOneAndUpdate(
        { userId: req.user.id, videoId },
        { progressSec, completed: completed ?? false, watchedAt: new Date() },
        { upsert: true, new: true },
      );
      res.json(entry);
    } catch (e) {
      next(e);
    }
  },
);

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const history = await WatchHistory.find({ userId: req.user.id })
      .populate("videoId", "title thumbnailUrl durationSec hlsUrl")
      .sort({ watchedAt: -1 })
      .limit(50);
    res.json(history);
  } catch (e) {
    next(e);
  }
});

router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const [totalWatched, completedCount, recent] = await Promise.all([
      WatchHistory.countDocuments({ userId: req.user.id }),
      WatchHistory.countDocuments({ userId: req.user.id, completed: true }),
      WatchHistory.find({ userId: req.user.id }).sort({ watchedAt: -1 }).limit(5).populate("videoId", "title"),
    ]);

    res.json({
      totalWatched,
      completedCount,
      completionRate: totalWatched ? completedCount / totalWatched : 0,
      recent: recent.map((r) => ({
        title: r.videoId?.title,
        progressSec: r.progressSec,
        watchedAt: r.watchedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** Creator: views per video */
router.get("/creator/:creatorId", requireAuth, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.creatorId) {
      throw new AppError("Forbidden", 403);
    }
    const stats = await Video.aggregate([
      { $match: { creatorId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" },
          totalVideos: { $sum: 1 },
        },
      },
    ]);
    res.json(stats[0] || { totalViews: 0, totalVideos: 0 });
  } catch (e) {
    next(e);
  }
});

export default router;
