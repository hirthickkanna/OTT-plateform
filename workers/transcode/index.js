/**
 * FFmpeg transcode worker (run separately: node workers/transcode/index.js)
 * Requires: Redis, FFmpeg, MONGODB_URI, WORKER_SECRET
 */
import "dotenv/config";
import { spawn } from "child_process";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import path from "path";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";
import crypto from "crypto";

const API = process.env.API_URL || "http://127.0.0.1:5000";
const OUTPUT = process.env.TRANSCODE_OUTPUT_DIR || "./transcoded";
const FFMPEG = (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH !== "ffmpeg") 
  ? process.env.FFMPEG_PATH 
  : (ffmpegPath || "ffmpeg");

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: "inherit" });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
}

async function transcode(videoId, sourcePath) {
  const outDir = path.join(OUTPUT, videoId);
  fs.mkdirSync(outDir, { recursive: true });

  // Generate 16-byte random key
  const keyBytes = crypto.randomBytes(16);
  const aesKeyHex = keyBytes.toString("hex");

  const keyPath = path.join(outDir, "video.key");
  const keyInfoPath = path.join(outDir, "video.keyinfo");

  // Save binary key file on disk temporarily for FFmpeg
  fs.writeFileSync(keyPath, keyBytes);

  // Write keyinfo file (Line 1: Key server URL, Line 2: Path to key file)
  const keyUrl = `${API}/api/streaming/key/${videoId}`;
  const keyInfoContent = `${keyUrl}\n${keyPath.replace(/\\/g, "/")}\n`;
  fs.writeFileSync(keyInfoPath, keyInfoContent);

  const renditions = [
    { name: "360p", scale: 360, bandwidth: 800000 },
    { name: "720p", scale: 720, bandwidth: 2500000 },
  ];

  try {
    for (const r of renditions) {
      const segDir = path.join(outDir, r.name);
      fs.mkdirSync(segDir, { recursive: true });
      await runFfmpeg([
        "-i",
        sourcePath,
        "-vf",
        `scale=-2:${r.scale}`,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-ac",
        "2",
        "-b:a",
        "128k",
        "-sn",
        "-hls_time",
        "6",
        "-hls_key_info_file",
        keyInfoPath,
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        path.join(segDir, "seg_%03d.ts"),
        path.join(segDir, "index.m3u8"),
      ]);
    }

    // Write top-level master HLS playlist
    const masterContent = [
      "#EXTM3U",
      "#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360",
      "360p/index.m3u8",
      "#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720",
      "720p/index.m3u8",
    ].join("\n");

    await fs.promises.writeFile(path.join(outDir, "master.m3u8"), masterContent);

    const res = await fetch(`${API}/api/streaming/videos/${videoId}/ready`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": process.env.WORKER_SECRET || "dev-worker",
      },
      body: JSON.stringify({ durationSec: 0, aesKey: aesKeyHex }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API PATCH failed: status ${res.status} - ${text}`);
    }
  } finally {
    // Crucial: Clean up local key files immediately so they aren't exposed publicly
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    if (fs.existsSync(keyInfoPath)) fs.unlinkSync(keyInfoPath);
  }
}

new Worker(
  "transcode",
  async (job) => {
    const { videoId, sourcePath } = job.data;
    console.log("Transcoding", videoId);
    try {
      await transcode(videoId, sourcePath);
      console.log("Transcoding finished successfully for", videoId);
    } catch (err) {
      console.error("Transcoding failed for", videoId, err);
      throw err;
    }
  },
  { connection },
);

console.log("Transcode worker listening on queue: transcode");
