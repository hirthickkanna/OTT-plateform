import mongoose from "mongoose";

const deviceSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceName: { type: String, required: true },
    deviceId: { type: String, required: true },
    tokenHash: { type: String, required: true },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

deviceSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceSession = mongoose.model("DeviceSession", deviceSessionSchema);
