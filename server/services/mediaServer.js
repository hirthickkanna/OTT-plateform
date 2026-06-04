import NodeMediaServer from "node-media-server";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { LiveChannel } from "../models/LiveChannel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve uploads/live root
const mediaRoot = path.resolve(__dirname, "../../uploads/live");
if (!fs.existsSync(mediaRoot)) {
  fs.mkdirSync(mediaRoot, { recursive: true });
}

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: "*"
  },
  static: {
    router: "/",
    root: mediaRoot
  }
};

const nms = new NodeMediaServer(config);

// Keep track of active processes by session ID
nms.hlsProcesses = new Map();
nms.relays = new Map();

// In NMS v4, these events pass the unified session object as the sole parameter
nms.on("postPublish", async (session) => {
  const id = session.id;
  const StreamPath = session.streamPath;
  
  console.log(`[MediaServer] Stream publish started: ${StreamPath} (session: ${id})`);
  const pathParts = StreamPath.split("/");
  const app = pathParts[1];
  const streamKey = pathParts[2];

  if (app === "live" && streamKey) {
    try {
      // Sanitize streamKey to prevent folder creation crashes on Windows (removes : / \ etc.)
      const sanitizedKey = streamKey.replace(/[^a-zA-Z0-9-_]/g, "");
      if (!sanitizedKey) {
        console.warn("[MediaServer] Stream key was empty after sanitization. Aborting HLS/Relay setup.");
        return;
      }

      // 1. Create directory for HLS segments
      const streamDir = path.join(mediaRoot, "live", sanitizedKey);
      if (!fs.existsSync(streamDir)) {
        fs.mkdirSync(streamDir, { recursive: true });
      }

      console.log(`[MediaServer] Spawning local HLS transcoder for stream ${sanitizedKey}...`);

      // Spawn FFmpeg to convert incoming RTMP feed to HLS segments on disk
      const hlsProcess = spawn(ffmpegPath, [
        "-i", `rtmp://localhost:1935${StreamPath}`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-g", "60",
        "-keyint_min", "60",
        "-sc_threshold", "0",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "hls",
        "-hls_time", "2",
        "-hls_list_size", "3",
        "-hls_flags", "delete_segments",
        "-hls_segment_filename", path.join(streamDir, "seg_%03d.ts"),
        path.join(streamDir, "index.m3u8")
      ]);

      hlsProcess.on("close", (code) => {
        console.log(`[MediaServer] HLS transcoder for stream ${sanitizedKey} exited with code ${code}`);
      });

      nms.hlsProcesses.set(id, hlsProcess);

      // 2. Relay to YouTube if user stream key has youtubeStreamKey configured
      const channel = await LiveChannel.findOne({ streamKey: sanitizedKey });
      if (channel && channel.youtubeStreamKey) {
        console.log(`[MediaServer] Relaying stream ${sanitizedKey} to YouTube Live...`);
        
        const relayProcess = spawn(ffmpegPath, [
          "-i", `rtmp://localhost:1935${StreamPath}`,
          "-c", "copy",
          "-f", "flv",
          `rtmp://a.rtmp.youtube.com/live2/${channel.youtubeStreamKey}`
        ]);

        relayProcess.on("close", (code) => {
          console.log(`[MediaServer] YouTube relay for stream ${sanitizedKey} exited with code ${code}`);
        });

        nms.relays.set(id, relayProcess);
      } else {
        console.log(`[MediaServer] No YouTube stream key set for ${sanitizedKey} (or channel not found). Multistreaming disabled.`);
      }
    } catch (err) {
      console.error("[MediaServer] Failed to setup HLS transcoding/relaying:", err);
    }
  }
});

nms.on("donePublish", (session) => {
  const id = session.id;
  const StreamPath = session.streamPath;
  
  console.log(`[MediaServer] Stream publish ended: ${StreamPath} (session: ${id})`);
  
  // Kill and cleanup HLS process
  if (nms.hlsProcesses.has(id)) {
    const hlsProcess = nms.hlsProcesses.get(id);
    hlsProcess.kill();
    nms.hlsProcesses.delete(id);
    console.log(`[MediaServer] Terminated HLS transcode process for session ${id}`);
  }

  // Kill and cleanup YouTube relay process
  if (nms.relays.has(id)) {
    const relayProcess = nms.relays.get(id);
    relayProcess.kill();
    nms.relays.delete(id);
    console.log(`[MediaServer] Terminated YouTube relay process for session ${id}`);
  }

  // Remove generated HLS files after a short delay
  const pathParts = StreamPath.split("/");
  const app = pathParts[1];
  const streamKey = pathParts[2];
  if (app === "live" && streamKey) {
    const sanitizedKey = streamKey.replace(/[^a-zA-Z0-9-_]/g, "");
    if (sanitizedKey) {
      const streamDir = path.join(mediaRoot, "live", sanitizedKey);
      setTimeout(() => {
        if (fs.existsSync(streamDir)) {
          fs.rmSync(streamDir, { recursive: true, force: true });
          console.log(`[MediaServer] Cleaned up HLS directory for ${sanitizedKey}`);
        }
      }, 5000);
    }
  }
});

export const startMediaServer = () => {
  nms.run();
  console.log("[MediaServer] Live streaming server started successfully.");
  console.log(" - RTMP Ingest URL: rtmp://localhost:1935/live");
  console.log(" - HLS Playback URL: http://localhost:8000/live/{streamKey}/index.m3u8");
};

export default nms;
