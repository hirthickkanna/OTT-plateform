import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import * as authService from "../services/auth.service.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { User } from "../models/User.js";
import { UserSubscription } from "../models/UserSubscription.js";
import { WatchHistory } from "../models/WatchHistory.js";

const router = Router();

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);
}

router.post(
  "/register",
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
  body("deviceId").notEmpty(),
  body("deviceName").notEmpty(),
  async (req, res, next) => {
    try {
      validate(req);
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/login",
  body("email").isEmail(),
  body("password").notEmpty(),
  body("deviceId").notEmpty(),
  body("deviceName").notEmpty(),
  async (req, res, next) => {
    try {
      validate(req);
      res.json(await authService.login(req.body));
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/firebase",
  body("idToken").notEmpty(),
  body("deviceId").notEmpty(),
  body("deviceName").notEmpty(),
  async (req, res, next) => {
    try {
      validate(req);
      const { idToken, deviceId, deviceName } = req.body;
      const firebaseUser = await verifyFirebaseToken(idToken);
      
      const result = await authService.firebaseAuth({
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        displayName: firebaseUser.name,
        deviceId,
        deviceName,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

router.get("/devices", requireAuth, async (req, res, next) => {
  try {
    res.json(await authService.listDevices(req.user.id));
  } catch (e) {
    next(e);
  }
});

router.delete("/devices/:sessionId", requireAuth, async (req, res, next) => {
  try {
    res.json(await authService.revokeDevice(req.user.id, req.params.sessionId));
  } catch (e) {
    next(e);
  }
});

// GET /api/auth/me — fetch current user profile + subscription + watch count (always fresh from DB)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash -firebaseUid");
    if (!user) return res.status(404).json({ message: "User not found" });

    const subscription = await UserSubscription.findOne({
      userId: req.user.id,
      status: "active",
    }).populate("planId");

    const watchCount = await WatchHistory.countDocuments({ userId: req.user.id });

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName || "",
        phone: user.phone || "",
        role: user.role,
        createdAt: user.createdAt,
      },
      subscription,
      watchCount,
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/auth/me — save display name and phone to DB
router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { displayName, phone } = req.body;
    const update = {};
    if (displayName !== undefined) update.displayName = String(displayName).trim();
    if (phone !== undefined) update.phone = String(phone).trim();

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true },
    ).select("-passwordHash -firebaseUid");

    if (!user) throw new AppError("User not found", 404);

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName || "",
        phone: user.phone || "",
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;

