import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    progressSec: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    watchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

watchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, watchedAt: -1 });

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);
