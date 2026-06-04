import "../config/env.js";
import mongoose from "mongoose";
import { Video } from "../models/Video.js";

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const updated = await Video.findByIdAndUpdate(
      "6a210fa06bdf8e1f902a3b03",
      { $set: { languages: ["Malayalam", "Tamil", "English"], genre: "Thriller", year: 2024, rating: "R" } },
      { new: true }
    );
    console.log("VIDEO_STATE_START");
    console.log(JSON.stringify(updated, null, 2));
    console.log("VIDEO_STATE_END");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
