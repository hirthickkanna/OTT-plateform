import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Video } from "../models/Video.js";
import { WatchHistory } from "../models/WatchHistory.js";

const router = Router();

/** Similar movies for watch page (excludes current title) */
router.get("/similar/:videoId", async (req, res, next) => {
  try {
    const current = await Video.findById(req.params.videoId);
    if (!current) {
      return res.status(404).json({ message: "Video not found" });
    }

    const filter = {
      status: "ready",
      isLive: false,
      isApproved: true,
      _id: { $ne: current._id },
    };
    if (current.genre) filter.genre = current.genre;

    let candidates = await Video.find(filter).sort({ viewCount: -1 }).limit(8);

    if (candidates.length < 4) {
      candidates = await Video.find({
        status: "ready",
        isLive: false,
        isApproved: true,
        _id: { $ne: current._id },
      })
        .sort({ viewCount: -1 })
        .limit(8);
    }

    res.json(
      candidates.map((v) => ({
        videoId: v._id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        reason: current.genre && v.genre === current.genre ? `More ${current.genre}` : "Popular picks",
      })),
    );
  } catch (e) {
    next(e);
  }
});

/** Public trending movies for guests and home "More for you" rows */
router.get("/trending", async (_req, res, next) => {
  try {
    const candidates = await Video.find({ status: "ready", isLive: false, isApproved: true })
      .sort({ viewCount: -1 })
      .limit(12);

    res.json(
      candidates.map((v, i) => ({
        videoId: v._id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        score: 1 - i * 0.05,
        reason: "Trending this week",
      })),
    );
  } catch (e) {
    next(e);
  }
});

/**
 * AI recommendations stub: ranks catalog by co-watch patterns / recency.
 * Replace with ML API or embedding search in production.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const history = await WatchHistory.find({ userId: req.user.id })
      .sort({ watchedAt: -1 })
      .limit(10)
      .select("videoId");

    const watchedIds = history.map((h) => h.videoId);
    const candidates = await Video.find({
      status: "ready",
      isApproved: true,
      _id: { $nin: watchedIds },
    })
      .sort({ viewCount: -1 })
      .limit(12);

    const recommendations = candidates.map((v, i) => ({
      videoId: v._id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      score: 1 - i * 0.05,
      reason: watchedIds.length ? "Because you watched similar titles" : "Trending now",
    }));

    res.json(recommendations);
  } catch (e) {
    next(e);
  }
});

export default router;
