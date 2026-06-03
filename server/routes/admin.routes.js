import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { Video } from "../models/Video.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

// GET /api/admin/videos — list all videos for moderation
router.get("/videos", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const videos = await Video.find()
      .populate("creatorId", "email displayName")
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/admin/videos/:id/approve — approve video
router.patch("/videos/:id/approve", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!video) throw new AppError("Video not found", 404);
    res.json(video);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/admin/videos/:id/reject — reject/disapprove video
router.patch("/videos/:id/reject", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { isApproved: false },
      { new: true }
    );
    if (!video) throw new AppError("Video not found", 404);
    res.json(video);
  } catch (e) {
    next(e);
  }
});

export default router;
