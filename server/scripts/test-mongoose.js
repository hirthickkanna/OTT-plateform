import mongoose from "mongoose";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve("../.env") });

const uri = process.env.MONGODB_URI;
console.log("Connecting to:", uri);

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    tlsAllowInvalidCertificates: true,
  });
  console.log("Connected successfully to Atlas via Mongoose!");
  await mongoose.disconnect();
} catch (err) {
  console.error("Mongoose connection failed!");
  console.error("Error name:", err.name);
  console.error("Message:", err.message);
  
  if (err.reason && err.reason.servers) {
    console.log("\nServer description errors:");
    for (const [serverHost, desc] of err.reason.servers.entries()) {
      console.log(`Server: ${serverHost}`);
      if (desc.error) {
        console.log(`  Error:`, desc.error.message || desc.error);
        if (desc.error.stack) {
          console.log(`  Stack:`, desc.error.stack);
        }
      } else {
        console.log(`  No error property recorded.`);
      }
    }
  }
}
