import bcrypt from "bcryptjs";
import { Plan } from "../models/Plan.js";
import { User } from "../models/User.js";
import { Video } from "../models/Video.js";
import { UserSubscription } from "../models/UserSubscription.js";

const plans = [
  {
    name: "Basic",
    slug: "basic",
    priceCents: 50000,
    features: ["HD streaming", "1 device"],
    stripePriceId: "price_basic_placeholder",
  },
  {
    name: "Premium",
    slug: "premium",
    priceCents: 100000,
    features: ["4K streaming", "4 devices", "DRM titles"],
    stripePriceId: "price_premium_placeholder",
  },
];

const demoMovies = [
  {
    title: "Midnight Horizon",
    description:
      "A pilot races against time to save a city on the edge of collapse. When the grid fails, only one route remains — through the storm.",
    genre: "Sci-Fi",
    year: 2024,
    rating: "PG-13",
    durationSec: 6840,
    languages: ["English", "Tamil", "Hindi"],
    viewCount: 12400,
    status: "ready",
    thumbnailUrl: "/posters/midnight-horizon.png",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    title: "Echoes of Tomorrow",
    description:
      "Two strangers share dreams that predict the future — until one vision names the wrong survivor.",
    genre: "Thriller",
    year: 2023,
    rating: "R",
    durationSec: 5520,
    languages: ["English", "Spanish", "French"],
    viewCount: 9800,
    status: "ready",
    thumbnailUrl: "/posters/echoes-of-tomorrow.png",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    title: "The Last Signal",
    description:
      "Scientists decode a message from deep space with impossible instructions. Every answer raises a deadlier question.",
    genre: "Sci-Fi",
    year: 2025,
    rating: "PG-13",
    durationSec: 7200,
    languages: ["English", "Japanese", "Korean"],
    viewCount: 15200,
    status: "ready",
    thumbnailUrl: "/posters/the-last-signal.png",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    title: "Neon Drift",
    description:
      "Street racers in a flooded metropolis fight for freedom and family while corporate hunters close in.",
    genre: "Action",
    year: 2024,
    rating: "PG-13",
    durationSec: 6180,
    languages: ["English", "Tamil", "Telugu"],
    viewCount: 7600,
    status: "ready",
    thumbnailUrl: "/posters/neon-drift.png",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    title: "Silent Depths",
    description:
      "A submarine crew discovers an ancient structure beneath the Arctic ice — and something still breathing inside.",
    genre: "Horror",
    year: 2022,
    rating: "R",
    durationSec: 5940,
    languages: ["English", "German"],
    viewCount: 11300,
    status: "ready",
    thumbnailUrl: "/posters/silent-depths.png",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    title: "Paper Comet",
    description:
      "An animator's sketches come to life and rewrite her past. She must choose which memory to erase forever.",
    genre: "Drama",
    year: 2023,
    rating: "PG",
    durationSec: 5280,
    languages: ["English", "Hindi", "Malayalam"],
    viewCount: 5400,
    status: "ready",
    thumbnailUrl: "/posters/paper-comet.png",
    hlsUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
];

/** Seed plans, demo movies, and a test user when the DB is empty (dev only). */
export async function ensureDevSeed() {
  if (process.env.NODE_ENV === "production") return;

  for (const p of plans) {
    await Plan.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true });
  }
  console.log("Dev seed: subscription plans");

  let creator = await User.findOne({ email: "demo@streamvault.local" });
  if (!creator) {
    const passwordHash = await bcrypt.hash("demo12345", 10);
    creator = await User.create({
      email: "demo@streamvault.local",
      passwordHash,
      displayName: "Demo Creator",
      role: "creator",
    });
    console.log("Dev seed: demo user demo@streamvault.local / demo12345");
  }

  let admin = await User.findOne({ email: "admin@streamvault.local" });
  if (!admin) {
    const passwordHash = await bcrypt.hash("admin12345", 10);
    admin = await User.create({
      email: "admin@streamvault.local",
      passwordHash,
      displayName: "Demo Admin",
      role: "admin",
    });
    console.log("Dev seed: admin user admin@streamvault.local / admin12345");
  }

  // Ensure both demo creator and admin have active subscriptions
  const premiumPlan = await Plan.findOne({ slug: "premium" });
  if (premiumPlan) {
    await UserSubscription.findOneAndUpdate(
      { userId: creator._id },
      {
        userId: creator._id,
        planId: premiumPlan._id,
        status: "active",
        fullName: "Demo Creator",
        phone: "+91 99999 99999",
      },
      { upsert: true },
    );

    await UserSubscription.findOneAndUpdate(
      { userId: admin._id },
      {
        userId: admin._id,
        planId: premiumPlan._id,
        status: "active",
        fullName: "Demo Admin",
        phone: "+91 99999 88888",
      },
      { upsert: true },
    );
    console.log("Dev seed: active Premium plans seeded for demo and admin users");
  }

  const videoCount = await Video.countDocuments({ status: "ready", isLive: false });
  if (videoCount === 0) {
    for (const movie of demoMovies) {
      await Video.create({ ...movie, creatorId: creator._id, isApproved: true, isLive: false });
    }
    console.log(`Dev seed: ${demoMovies.length} demo movies`);
  } else {
    for (const movie of demoMovies) {
      await Video.findOneAndUpdate(
        { title: movie.title },
        { $set: { ...movie, isApproved: true } },
        { upsert: false },
      );
    }
    await Video.updateMany(
      { languages: { $exists: false } },
      { $set: { languages: ["English"] } },
    );
  }
}
