import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { User } from "../models/User.js";
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
      const sub = await UserSubscription.getActiveForUser(req.user.id);
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

    const { durationSec, aesKey } = req.body;
    const updateData = {
      status: "ready",
      hlsUrl: `/vod/${req.params.videoId}/master.m3u8`,
      durationSec,
    };
    if (aesKey) {
      updateData.aesKey = aesKey;
      updateData.hlsEncrypted = true;
    }

    const video = await Video.findByIdAndUpdate(
      req.params.videoId,
      updateData,
      { new: true },
    );
    if (!video) throw new AppError("Video not found", 404);
    res.json(video);
  } catch (e) {
    next(e);
  }
});

// GET /api/streaming/key/:videoId — serve the decryption key to authorized subscribers
router.get("/key/:videoId", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : req.query.token;

    if (!token) {
      throw new AppError("Authentication required to fetch stream key", 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const video = await Video.findById(req.params.videoId);
    if (!video) {
      throw new AppError("Video not found", 404);
    }

    // Verify user authorization: admin, creator, or active subscriber
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError("User not found", 401);
    }

    const sub = await UserSubscription.getActiveForUser(user._id);
    if (!sub) {
      throw new AppError("Active subscription required to play secured content", 403);
    }

    if (!video.hlsEncrypted || !video.aesKey) {
      throw new AppError("Video is not encrypted", 400);
    }

    // Return the binary key
    const keyBuffer = Buffer.from(video.aesKey, "hex");
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(keyBuffer);
  } catch (e) {
    next(e);
  }
});

export default router;
