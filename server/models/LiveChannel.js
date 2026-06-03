import mongoose from "mongoose";
import crypto from "crypto";

const liveChannelSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    streamKey: { type: String, unique: true, default: () => crypto.randomBytes(16).toString("hex") },
    hlsUrl: String,
    isActive: { type: Boolean, default: false },
    startedAt: Date,
  },
  { timestamps: true },
);

export const LiveChannel = mongoose.model("LiveChannel", liveChannelSchema);
