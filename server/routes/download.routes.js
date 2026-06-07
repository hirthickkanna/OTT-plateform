import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Download } from "../models/Download.js";
import { Video } from "../models/Video.js";

const router = Router();

// GET /api/downloads — Fetch user's downloads populated with video details
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const downloads = await Download.find({ userId: req.user.id })
      .populate("videoId")
      .sort({ downloadedAt: -1 });

    // Filter out any downloads where the video might have been deleted from the database
    const validVideos = downloads
      .filter((d) => d.videoId)
      .map((d) => {
        const videoObj = d.videoId.toObject();
        return {
          ...videoObj,
          downloadedAt: d.downloadedAt,
        };
      });

    res.json(validVideos);
  } catch (e) {
    next(e);
  }
});

// POST /api/downloads — Add a video to user's downloads
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      throw new AppError("Video ID is required", 400);
    }

    // Verify video exists
    const video = await Video.findById(videoId);
    if (!video) {
      throw new AppError("Video not found", 404);
    }

    // Upsert or find existing to prevent unique index collisions
    const download = await Download.findOneAndUpdate(
      { userId: req.user.id, videoId },
      { $setOnInsert: { userId: req.user.id, videoId } },
      { upsert: true, new: true },
    );

    res.status(201).json(download);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/downloads/:videoId — Remove a video from user's downloads
router.delete("/:videoId", requireAuth, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      throw new AppError("Video ID is required", 400);
    }

    const result = await Download.deleteOne({ userId: req.user.id, videoId });
    
    if (result.deletedCount === 0) {
      throw new AppError("Download record not found", 404);
    }

    res.json({ success: true, message: "Download removed successfully" });
  } catch (e) {
    next(e);
  }
});

export default router;
