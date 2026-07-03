/**
 * Debug script — connect to MongoDB Atlas via SRV URI.
 * NEW-CRIT-1 FIX: Credentials MUST come from the .env file, never hardcoded.
 */
import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is not set. Add it to your .env file.");
  process.exit(1);
}

console.log("Connecting via SRV to Atlas...");

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    // NEW-LOW-1 FIX: Do NOT use tlsAllowInvalidCertificates — it disables TLS verification.
  });
  console.log("✅ Connected successfully to Atlas via SRV!");
  await mongoose.disconnect();
} catch (err) {
  console.error("❌ Mongoose SRV connection failed!");
  console.error("Error name:", err.name);
  console.error("Message:", err.message);

  if (err.reason && err.reason.servers) {
    console.log("\nServer description errors:");
    for (const [serverHost, desc] of err.reason.servers.entries()) {
      console.log(`Server: ${serverHost}`);
      if (desc.error) {
        console.log(`  Error:`, desc.error.message || desc.error);
      } else {
        console.log(`  No error property recorded.`);
      }
    }
  }
}
