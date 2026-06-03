import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      enum: ["pending", "active", "canceled", "past_due"],
      default: "active",
    },
    stripeSubscriptionId: String,
    currentPeriodEnd: Date,
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true },
);

userSubscriptionSchema.index({ userId: 1 });

export const UserSubscription = mongoose.model("UserSubscription", userSubscriptionSchema);
