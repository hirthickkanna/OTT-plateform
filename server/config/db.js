import mongoose from "mongoose";

const LOCAL_URI = "mongodb://127.0.0.1:27017/ott_platform";

let memoryServer;

function isAtlasUri(uri) {
  return uri?.includes("mongodb+srv");
}

async function tryConnect(uri, label) {
  await mongoose.connect(uri, { 
    serverSelectionTimeoutMS: 8000,
    tlsAllowInvalidCertificates: true
  });
  console.log(`MongoDB connected (${label})`);
}

async function connectMemoryDB() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri("ott_platform");
  await tryConnect(uri, "in-memory (no Docker/Atlas required)");
  console.warn("Using temporary in-memory MongoDB. Data is lost when the server stops.");
  console.warn("For persistent local data: install Docker and run npm run docker:up");
}

/**
 * Connect to MongoDB. In development, falls back to local then in-memory Mongo
 * when Atlas (or the configured URI) is unreachable.
 */
export async function connectDB() {
  const primary = process.env.MONGODB_URI || LOCAL_URI;
  const isDev = process.env.NODE_ENV !== "production";

  try {
    await tryConnect(primary, isAtlasUri(primary) ? "Atlas" : "configured URI");
    return;
  } catch (primaryErr) {
    console.error("MongoDB Atlas connection error:", primaryErr);
    if (!isDev) throw primaryErr;

    const canFallback = primary !== LOCAL_URI;
    if (canFallback) {
      console.warn(
        "Primary MongoDB unreachable. Trying local MongoDB at 127.0.0.1:27017…",
      );
      try {
        await mongoose.disconnect().catch(() => {});
        await tryConnect(LOCAL_URI, "local");
        console.warn("Connected to local MongoDB. Run npm run docker:up for a persistent database.");
        return;
      } catch {
        /* try in-memory next */
      }
    }

    console.warn("Local MongoDB not available. Starting in-memory database for development…");
    try {
      await mongoose.disconnect().catch(() => {});
      await connectMemoryDB();
      return;
    } catch (memErr) {
      console.error("\nCould not connect to any MongoDB.");
      console.error("Atlas: whitelist your IP in MongoDB Atlas → Network Access");
      console.error("Local: install Docker Desktop and run npm run docker:up");
      console.error("Or set MONGODB_URI=mongodb://127.0.0.1:27017/ott_platform in .env\n");
      throw memErr;
    }
  }
}

export async function stopMemoryDB() {
  if (memoryServer) {
    await mongoose.disconnect().catch(() => {});
    await memoryServer.stop();
    memoryServer = undefined;
  }
}
