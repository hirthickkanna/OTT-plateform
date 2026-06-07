import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "inr" },
    stripePaymentId: String,
    razorpayPaymentId: String,
    razorpayOrderId: String,
    status: { type: String, required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
