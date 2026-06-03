import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { Payment } from "../models/Payment.js";
import { Plan } from "../models/Plan.js";
import { UserSubscription } from "../models/UserSubscription.js";

const router = Router();

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json(payments);
  } catch (e) {
    next(e);
  }
});

router.post("/webhook", async (req, res) => {
  const s = stripe();
  if (!s) return res.status(503).send("Stripe not configured");

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = s.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Webhook error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, planId } = session.metadata || {};
    if (userId && planId) {
      await UserSubscription.findOneAndUpdate(
        { userId },
        {
          userId,
          planId,
          status: "active",
          stripeSubscriptionId: session.subscription,
        },
        { upsert: true, new: true },
      );
      const plan = await Plan.findById(planId);
      if (plan) {
        await Payment.create({
          userId,
          amountCents: plan.priceCents,
          stripePaymentId: session.payment_intent,
          status: "succeeded",
        });
      }
    }
  }

  res.json({ received: true });
});

export default router;
