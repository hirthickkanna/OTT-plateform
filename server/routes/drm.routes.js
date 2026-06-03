import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Video } from "../models/Video.js";

const router = Router();

/** Returns DRM license config for a protected title */
router.get("/license/:videoId", requireAuth, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video?.drmEnabled) {
      return res.status(404).json({ message: "DRM not enabled for this title" });
    }
    res.json({
      licenseUrl: process.env.DRM_LICENSE_URL || null,
      keyId: process.env.DRM_KEY_ID || null,
      provider: "widevine-fairplay-stub",
    });
  } catch (e) {
    next(e);
  }
});

export default router;
