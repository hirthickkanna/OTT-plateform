import "../config/env.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { ensureDevSeed } from "../config/devSeed.js";

await connectDB();
await ensureDevSeed();
console.log("Seed complete");
await mongoose.disconnect();
