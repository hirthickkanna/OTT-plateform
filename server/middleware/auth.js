import jwt from "jsonwebtoken";
import { DeviceSession } from "../models/DeviceSession.js";
import { User } from "../models/User.js";
import { AppError } from "./errorHandler.js";

/**
 * NEW-MED-1 FIX: Return the JWT secret, throwing in production if it's missing or insecure.
 * "dev-secret" fallback is only acceptable in local development.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === "dev-secret")) {
    throw new Error("[SECURITY] JWT_SECRET must be set to a strong secret in production");
  }
  return secret || "dev-secret";
}

/**
 * Extract the JWT from (in priority order):
 *  1. Authorization: Bearer <token>  header
 *  2. httpOnly cookie named "token"  (LOW-1: tokens stored in httpOnly cookie)
 */
function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

export async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = jwt.verify(token, getJwtSecret());

    // Find the session WITHOUT populate — just get the raw userId ObjectId
    const session = await DeviceSession.findById(payload.sessionId);
    if (!session) {
      throw new AppError("Session not found. Please log in again.", 401);
    }

    // Compare userId directly (no populate needed)
    if (session.userId.toString() !== payload.sub) {
      throw new AppError("Invalid session", 401);
    }

    // Fetch the user separately to avoid any populate/model-reload issues
    const user = await User.findById(session.userId).select("-passwordHash");
    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Update last active timestamp
    session.lastActive = new Date();
    await session.save();

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session._id.toString(),
    };

    next();
  } catch (e) {
    // Pass AppErrors through directly; wrap JWT errors
    if (e.status) return next(e);
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return next(new AppError("Token invalid or expired. Please log in again.", 401));
    }
    next(new AppError(e.message || "Internal Server Error", 500));
  }
}

export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  requireAuth(req, _res, next);
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return next(new AppError("Admin access required", 403));
  }
  next();
}
