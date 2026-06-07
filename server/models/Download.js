import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

downloadSchema.index({ userId: 1, videoId: 1 }, { unique: true });
downloadSchema.index({ userId: 1, downloadedAt: -1 });

export const Download = mongoose.model("Download", downloadSchema);
