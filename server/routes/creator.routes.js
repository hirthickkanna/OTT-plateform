import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { Video } from "../models/Video.js";

const router = Router();

async function ensureCreator(req) {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "creator" && user.role !== "admin") {
    await User.updateOne({ _id: user._id }, { role: "creator" });
  }
}

router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    await ensureCreator(req);
    const videos = await Video.find({ creatorId: req.user.id }).sort({ createdAt: -1 });
    const agg = await Video.aggregate([
      { $match: { creatorId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: null, totalViews: { $sum: "$viewCount" }, count: { $sum: 1 } } },
    ]);
    const payments = await Payment.find({ userId: req.user.id, status: "succeeded" });
    const revenueCents = payments.reduce((s, p) => s + p.amountCents, 0);

    res.json({
      videos,
      stats: {
        totalVideos: agg[0]?.count ?? 0,
        totalViews: agg[0]?.totalViews ?? 0,
        revenueCents,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
