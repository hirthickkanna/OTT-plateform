import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    priceCents: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    interval: { type: String, default: "month" },
    stripePriceId: String,
    features: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Plan = mongoose.model("Plan", planSchema);
