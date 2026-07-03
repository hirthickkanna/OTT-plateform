import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Payment } from "../models/Payment.js";
import { Video } from "../models/Video.js";

const router = Router();

/**
 * CRIT-3 FIX: Removed the previous ensureCreator() function that auto-promoted
 * any authenticated viewer to "creator" role. Now we strictly require the user
 * to already have the "creator" or "admin" role — an admin must grant it explicitly.
 */
function requireCreator(req, _res, next) {
  if (req.user?.role !== "creator" && req.user?.role !== "admin") {
    return next(new AppError("Creator access required. Contact an administrator to upgrade your account.", 403));
  }
  next();
}

router.get("/dashboard", requireAuth, requireCreator, async (req, res, next) => {
  try {
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
