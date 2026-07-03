import { Router } from "express";
import { body, validationResult } from "express-validator";
import escapeStringRegexp from "escape-string-regexp";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Video } from "../models/Video.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const query = { status: "ready", isLive: false, isApproved: true };
    if (req.query.search) {
      // MED-1: Escape user input before using as MongoDB $regex to prevent ReDoS
      const rawSearch = String(req.query.search).slice(0, 100); // max 100 chars
      const safeSearch = escapeStringRegexp(rawSearch);
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { genre: { $regex: safeSearch, $options: "i" } },
      ];
    }
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v");
    res.json(videos);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) throw new AppError("Video not found", 404);
    res.json(video);
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
      const video = await Video.create({
        creatorId: req.user.id,
        title: req.body.title,
        description: req.body.description,
        genre: req.body.genre,
        year: req.body.year,
        rating: req.body.rating,
        languages: req.body.languages || [],
        drmEnabled: req.body.drmEnabled ?? false,
      });
      res.status(201).json(video);
    } catch (e) {
      next(e);
    }
  },
);

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) throw new AppError("Video not found", 404);
    if (video.creatorId.toString() !== req.user.id) throw new AppError("Forbidden", 403);
    await Video.deleteOne({ _id: video._id });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
});

export default router;

