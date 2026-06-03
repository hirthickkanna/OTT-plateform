import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { Plan } from "../models/Plan.js";
import { UserSubscription } from "../models/UserSubscription.js";

const router = Router();

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

// GET /api/subscriptions/plans — public
router.get("/plans", async (_req, res, next) => {
  try {
    res.json(await Plan.find({ active: true }));
  } catch (e) {
    next(e);
  }
});

// GET /api/subscriptions/me — current user's active subscription
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const sub = await UserSubscription.findOne({ userId: req.user.id, status: "active" }).populate("planId");
    res.json(sub);
  } catch (e) {
    next(e);
  }
});

// POST /api/subscriptions/register — save user details + create/update pending subscription
router.post("/register", requireAuth, async (req, res, next) => {
  try {
    const { planId, fullName, phone, address } = req.body;
    if (!planId) throw new AppError("planId is required", 400);
    if (!fullName?.trim()) throw new AppError("Full name is required", 400);
    if (!phone?.trim()) throw new AppError("Mobile number is required", 400);

    const plan = await Plan.findById(planId);
    if (!plan) throw new AppError("Plan not found", 404);

    // Upsert a pending subscription record to save the user's details
    let sub = await UserSubscription.findOne({ userId: req.user.id, planId, status: "pending" });
    if (sub) {
      sub.fullName = fullName.trim();
      sub.phone = phone.trim();
      sub.address = address?.trim() || "";
      await sub.save();
    } else {
      sub = await UserSubscription.create({
        userId: req.user.id,
        planId,
        status: "pending",
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address?.trim() || "",
      });
    }

    // Try to create Stripe checkout session
    const s = stripe();
    if (s && plan.stripePriceId && !plan.stripePriceId.includes("placeholder")) {
      try {
        const session = await s.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: plan.stripePriceId, quantity: 1 }],
          success_url: `${process.env.CLIENT_URL}/account?subscribed=1`,
          cancel_url: `${process.env.CLIENT_URL}/subscribe`,
          metadata: { userId: req.user.id, planId: plan._id.toString(), subscriptionRecordId: sub._id.toString() },
        });
        return res.json({ url: session.url, subscriptionId: sub._id });
      } catch (stripeError) {
        console.error("Stripe Session Creation failed:", stripeError.message);
        if (process.env.NODE_ENV === "production") {
          throw stripeError;
        }
        console.log("Falling back to direct activation in dev mode");
      }
    }

    // No Stripe / placeholder / failed — mark as active directly (dev mode)
    sub.status = "active";
    await sub.save();
    res.json({ url: null, subscriptionId: sub._id, activated: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/subscriptions/checkout — legacy direct checkout (kept for backward compat)
router.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const s = stripe();
    if (!s) throw new AppError("Stripe not configured", 503);

    const plan = await Plan.findById(req.body.planId);
    if (!plan?.stripePriceId) throw new AppError("Invalid plan", 400);

    const session = await s.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/subscribe/success`,
      cancel_url: `${process.env.CLIENT_URL}/subscribe`,
      metadata: { userId: req.user.id, planId: plan._id.toString() },
    });

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

export default router;
