import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: String,
    genre: String,
    year: Number,
    rating: String,
    languages: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["uploading", "transcoding", "ready", "failed"],
      default: "uploading",
    },
    durationSec: Number,
    hlsUrl: String,
    thumbnailUrl: String,
    hlsEncrypted: { type: Boolean, default: false },
    aesKey: String,
    drmEnabled: { type: Boolean, default: false },
    isLive: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

videoSchema.index({ creatorId: 1 });
videoSchema.index({ status: 1 });

export const Video = mongoose.model("Video", videoSchema);
