import jwt from "jsonwebtoken";
import { DeviceSession } from "../models/DeviceSession.js";
import { User } from "../models/User.js";
import { AppError } from "./errorHandler.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401);
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");

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
    next(new AppError(e.message || "Unauthorized", 401));
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  requireAuth(req, _res, next);
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return next(new AppError("Admin access required", 403));
  }
  next();
}
