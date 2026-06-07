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
    razorpayOrderId: String,
    currentPeriodEnd: Date,
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true },
);

userSubscriptionSchema.index({ userId: 1 });

userSubscriptionSchema.statics.getActiveForUser = async function (userId) {
  const sub = await this.findOne({ userId, status: "active" }).populate("planId");
  if (sub && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
    sub.status = "canceled";
    await sub.save();
    return null;
  }
  return sub;
};

export const UserSubscription = mongoose.model("UserSubscription", userSubscriptionSchema);
