import { Router } from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { User } from "../models/User.js";
import { UserSubscription } from "../models/UserSubscription.js";
import { Video } from "../models/Video.js";
import { enqueueTranscode } from "../services/transcodeQueue.js";

const router = Router();
const cdn = () => process.env.CDN_BASE_URL || "";

// Resolve the safe upload directory for path traversal validation (HIGH-3)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

/**
 * NEW-MED-1 FIX: Return JWT secret safely — throws in production if missing/insecure.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === "dev-secret")) {
    throw new Error("[SECURITY] JWT_SECRET must be set to a strong secret in production");
  }
  return secret || "dev-secret";
}

// CRIT-2: Validate that WORKER_SECRET is strong in production
if (process.env.NODE_ENV === "production") {
  const secret = process.env.WORKER_SECRET;
  if (!secret || secret === "dev-worker" || secret.length < 32) {
    console.error("[SECURITY] WORKER_SECRET is missing, too short, or uses the insecure 'dev-worker' default. Set a strong 32+ char secret in production.");
    process.exit(1);
  }
}

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

// HIGH-3: Validate sourcePath is within the allowed uploads directory
router.post("/transcode", requireAuth, async (req, res, next) => {
  try {
    const { videoId, sourcePath } = req.body;
    if (!videoId || !sourcePath) throw new AppError("videoId and sourcePath required", 400);

    // Prevent path traversal: ensure sourcePath resolves inside UPLOAD_DIR
    const resolvedPath = path.resolve(sourcePath);
    if (!resolvedPath.startsWith(UPLOAD_DIR)) {
      throw new AppError("Invalid source path", 400);
    }

    res.json(await enqueueTranscode({ videoId, sourcePath: resolvedPath }));
  } catch (e) {
    next(e);
  }
});

router.get("/playback/:videoId", requireAuth, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video || video.status !== "ready" || !video.hlsUrl) {
      throw new AppError("Video not available", 403);
    }

    const sub = await UserSubscription.getActiveForUser(req.user.id);
    if (!sub) {
      throw new AppError("Active subscription required to play videos", 403);
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
    // CRIT-2: Verify the worker secret header
    const secret = req.headers["x-worker-secret"];
    if (!secret || secret !== process.env.WORKER_SECRET) {
      throw new AppError("Forbidden", 403);
    }

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

/**
 * GET /api/streaming/key/:videoId — serve the decryption key to authorized subscribers
 * MED-7 FIX: Token MUST be sent via Authorization: Bearer header only.
 * URL query params are logged by proxies/servers and expose the token.
 */
router.get("/key/:videoId", async (req, res, next) => {
  try {
    // MED-7: Only accept token from Authorization header or httpOnly cookie — NOT from query params
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : cookieToken || null;

    if (!token) {
      throw new AppError("Authentication required to fetch stream key", 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, getJwtSecret());
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
