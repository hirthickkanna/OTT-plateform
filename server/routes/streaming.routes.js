import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { UserSubscription } from "../models/UserSubscription.js";
import { Video } from "../models/Video.js";
import { enqueueTranscode } from "../services/transcodeQueue.js";

const router = Router();
const cdn = () => process.env.CDN_BASE_URL || "";

router.post("/upload/:videoId", requireAuth, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) throw new AppError("Video not found", 404);
    if (video.creatorId.toString() !== req.user.id) throw new AppError("Forbidden", 403);

    video.status = "transcoding";
    await video.save();

    const key = `uploads/${video._id}/source.mp4`;
    const bucket = process.env.S3_BUCKET || "ott-media";
    const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";

    res.json({
      uploadUrl: `${endpoint}/${bucket}/${key}`,
      objectKey: key,
      videoId: video._id,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/transcode", requireAuth, async (req, res, next) => {
  try {
    const { videoId, sourcePath } = req.body;
    if (!videoId || !sourcePath) throw new AppError("videoId and sourcePath required", 400);
    res.json(await enqueueTranscode({ videoId, sourcePath }));
  } catch (e) {
    next(e);
  }
});

router.get("/playback/:videoId", optionalAuth, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video || video.status !== "ready" || !video.hlsUrl) {
      throw new AppError("Video not available", 403);
    }

    if (video.drmEnabled && req.user?.id) {
      const sub = await UserSubscription.findOne({ userId: req.user.id, status: "active" });
      if (!sub) throw new AppError("Active subscription required", 403);
    }

    await Video.updateOne({ _id: video._id }, { $inc: { viewCount: 1 } });

    res.json({
      videoId: video._id,
      hlsUrl: video.hlsUrl,
      ...(video.drmEnabled && process.env.DRM_LICENSE_URL
        ? { drmLicenseUrl: process.env.DRM_LICENSE_URL }
        : {}),
    });
  } catch (e) {
    next(e);
  }
});

/** Internal: worker marks video ready after FFmpeg */
router.patch("/videos/:videoId/ready", async (req, res, next) => {
  try {
    const secret = req.headers["x-worker-secret"];
    if (secret !== process.env.WORKER_SECRET) throw new AppError("Forbidden", 403);

    const video = await Video.findByIdAndUpdate(
      req.params.videoId,
      {
        status: "ready",
        hlsUrl: `/vod/${req.params.videoId}/master.m3u8`,
        durationSec: req.body.durationSec,
      },
      { new: true },
    );
    if (!video) throw new AppError("Video not found", 404);
    res.json(video);
  } catch (e) {
    next(e);
  }
});

export default router;
