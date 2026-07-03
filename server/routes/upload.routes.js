import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Video } from "../models/Video.js";
import { enqueueTranscode } from "../services/transcodeQueue.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Directory setup ───────────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
const POSTER_DIR = path.resolve(__dirname, "../../uploads/posters");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(POSTER_DIR)) fs.mkdirSync(POSTER_DIR, { recursive: true });

// ── Video storage ─────────────────────────────────────────────────────────────
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.videoId}_${Date.now()}${ext}`);
  },
});

const videoFileFilter = (_req, file, cb) => {
  // HIGH-4: Removed "application/octet-stream" — it's the generic binary type and
  // would allow any executable, script, or malicious binary to be uploaded.
  const allowedMime = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-matroska",
    "video/mkv",
    "application/x-matroska",
    "video/avi",
    "video/x-msvideo",
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = [".mp4", ".webm", ".ogg", ".mov", ".mkv", ".avi"];

  // Both MIME and extension must be valid — extension alone is not sufficient
  const mimeOk = allowedMime.includes(file.mimetype);
  const extOk = allowedExt.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file type: ${file.mimetype} (${ext}). Allowed: MP4, WebM, MOV, MKV, AVI`, 400));
  }
};

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB max
});

// ── Poster (image) storage ────────────────────────────────────────────────────
const posterStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, POSTER_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `poster_${req.params.videoId}_${Date.now()}${ext}`);
  },
});

const posterFileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, AVIF`, 400));
  }
};

const uploadPoster = multer({
  storage: posterStorage,
  fileFilter: posterFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max for images
});

// ── POST /api/upload/:videoId/poster ─────────────────────────────────────────
router.post(
  "/:videoId/poster",
  requireAuth,
  (req, res, next) => {
    uploadPoster.single("poster")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError("Image too large. Maximum size is 10 MB.", 413));
        }
        return next(new AppError(err.message, 400));
      }
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("No image file received", 400);

      const video = await Video.findById(req.params.videoId);
      if (!video) throw new AppError("Video not found", 404);
      if (video.creatorId.toString() !== req.user.id) throw new AppError("Forbidden", 403);

      // Delete old poster file if it was a previously uploaded one (not a /posters/ static)
      if (video.thumbnailUrl && video.thumbnailUrl.includes("/uploads/posters/")) {
        const oldFilename = path.basename(video.thumbnailUrl.split("?")[0]);
        const oldPath = path.join(POSTER_DIR, oldFilename);
        if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
      }

      const posterUrl = `/uploads/posters/${req.file.filename}`;

      video.thumbnailUrl = posterUrl;
      await video.save();

      res.json({
        message: "Poster uploaded successfully",
        videoId: video._id,
        thumbnailUrl: posterUrl,
      });
    } catch (e) {
      if (req.file) fs.unlink(req.file.path, () => {});
      next(e);
    }
  },
);

// ── POST /api/upload/:videoId ─────────────────────────────────────────────────
router.post(
  "/:videoId",
  requireAuth,
  (req, res, next) => {
    uploadVideo.single("video")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError("File too large. Maximum size is 5 GB.", 413));
        }
        return next(new AppError(err.message, 400));
      }
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("No video file received", 400);

      const video = await Video.findById(req.params.videoId);
      if (!video) throw new AppError("Video not found", 404);
      if (video.creatorId.toString() !== req.user.id) throw new AppError("Forbidden", 403);

      const localVideoUrl = `/uploads/${req.file.filename}`;

      video.hlsUrl = localVideoUrl;
      video.status = "transcoding";
      await video.save();

      // Enqueue transcoding job
      await enqueueTranscode({ videoId: video._id.toString(), sourcePath: req.file.path });

      res.json({
        message: "Upload successful",
        videoId: video._id,
        filename: req.file.filename,
        size: req.file.size,
        videoUrl: localVideoUrl,
      });
    } catch (e) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      next(e);
    }
  },
);

export default router;
