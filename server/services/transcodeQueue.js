import { Queue } from "bullmq";
import IORedis from "ioredis";

let queue = null;

function getQueue() {
  if (queue) return queue;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith("rediss://") ? { tls: {} } : {}),
  });
  queue = new Queue("transcode", { connection });
  return queue;
}

export async function enqueueTranscode({ videoId, sourcePath }) {
  const q = getQueue();
  if (!q) {
    console.warn("[transcode] Redis unavailable — skipped:", videoId);
    return { queued: false };
  }
  await q.add("transcode", { videoId, sourcePath }, { removeOnComplete: 100 });
  return { queued: true };
}
