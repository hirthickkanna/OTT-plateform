import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: false },
    firebaseUid: { type: String, unique: true, sparse: true },
    displayName: String,
    role: { type: String, enum: ["viewer", "creator", "admin"], default: "viewer" },
    phone: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
