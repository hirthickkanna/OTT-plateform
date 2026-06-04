import "../config/env.js";
import mongoose from "mongoose";
import { LiveChannel } from "../models/LiveChannel.js";
import { connectDB } from "../config/db.js";

async function main() {
  console.log("Connecting to database...");
  await connectDB();
  
  console.log("Deleting all live channels from database...");
  const result = await LiveChannel.deleteMany({});
  
  console.log(`Successfully deleted ${result.deletedCount} channel(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error deleting channels:", err);
  process.exit(1);
});
