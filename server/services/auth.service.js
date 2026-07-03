import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { DeviceSession } from "../models/DeviceSession.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";

// NEW-MED-1 FIX: Throw in production if JWT_SECRET is missing or using the insecure default.
// The startup guard in index.js already catches this, but this is a belt-and-suspenders check.
const JWT_SECRET = () => {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === "dev-secret")) {
    throw new Error("[SECURITY] JWT_SECRET must be set to a strong secret in production");
  }
  return secret || "dev-secret"; // dev-secret only acceptable in local dev
};
const JWT_EXPIRES = () => process.env.JWT_EXPIRES_IN || "7d";

export async function register({ email, password, displayName, deviceId, deviceName }) {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, displayName, role: "viewer" });
  return createSession(user, deviceId, deviceName);
}

export async function login({ email, password, deviceId, deviceName }) {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Invalid credentials", 401);
  }
  return createSession(user, deviceId, deviceName);
}

export async function firebaseAuth({ email, uid, displayName, deviceId, deviceName }) {
  if (!email) {
    throw new AppError("Email is required from Firebase token", 400);
  }

  // Find user by firebaseUid or email
  let user = await User.findOne({
    $or: [{ firebaseUid: uid }, { email: email.toLowerCase() }],
  });

  if (!user) {
    // Register new user (since they logged in through Firebase, they are verified)
    user = await User.create({
      email: email.toLowerCase(),
      firebaseUid: uid,
      displayName: displayName || email.split("@")[0],
      role: "viewer",
    });
  } else if (!user.firebaseUid) {
    // If user existed with password but now signed in via Firebase (same email), link their account
    user.firebaseUid = uid;
    if (displayName && !user.displayName) {
      user.displayName = displayName;
    }
    await user.save();
  }

  return createSession(user, deviceId, deviceName);
}

async function createSession(user, deviceId, deviceName) {
  const tokenHash = crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex");
  const session = await DeviceSession.findOneAndUpdate(
    { userId: user._id, deviceId },
    { deviceName, tokenHash, lastActive: new Date() },
    { upsert: true, new: true },
  );

  const accessToken = jwt.sign(
    { sub: user._id.toString(), sessionId: session._id.toString() },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES() },
  );

  return {
    accessToken,
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName || "",
      phone: user.phone || "",
      role: user.role,
    },
  };
}

export async function listDevices(userId) {
  return DeviceSession.find({ userId })
    .select("deviceName deviceId lastActive createdAt")
    .sort({ lastActive: -1 });
}

export async function revokeDevice(userId, sessionId) {
  await DeviceSession.deleteOne({ _id: sessionId, userId });
  return { revoked: true };
}
