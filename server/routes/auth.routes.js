import { Router } from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import * as authService from "../services/auth.service.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { User } from "../models/User.js";
import { UserSubscription } from "../models/UserSubscription.js";
import { WatchHistory } from "../models/WatchHistory.js";

const router = Router();

// ── HIGH-1: Rate limiters for auth endpoints ──────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many accounts created from this IP. Please try again later." },
});

const firebaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." },
});

// ── Cookie helper ─────────────────────────────────────────────────────────────
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,             // LOW-1: inaccessible to JavaScript
    secure: isProduction,       // HTTPS only in production
    sameSite: isProduction ? "none" : "Lax", // Allow cross-site cookies in prod (Render + Vercel)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_EXPIRES_IN)
  });
}

function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "Lax",
  });
}

function validate(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);
}

router.post(
  "/register",
  registerLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("deviceId").notEmpty(),
  body("deviceName").notEmpty(),
  async (req, res, next) => {
    try {
      validate(req);
      const result = await authService.register(req.body);
      setAuthCookie(res, result.accessToken);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/login",
  loginLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  body("deviceId").notEmpty(),
  body("deviceName").notEmpty(),
  async (req, res, next) => {
    try {
      validate(req);
      const result = await authService.login(req.body);
      setAuthCookie(res, result.accessToken);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/firebase",
  firebaseLimiter,
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
      setAuthCookie(res, result.accessToken);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/auth/logout — clears the auth cookie
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

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

    const subscription = await UserSubscription.getActiveForUser(req.user.id);

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
