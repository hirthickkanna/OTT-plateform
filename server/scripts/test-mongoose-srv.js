import mongoose from "mongoose";

const uri = "mongodb+srv://hirthickkanna2005_db_user:hirthickkanna@ac-cxvihu9.tqu37wb.mongodb.net/ott_platform?retryWrites=true&w=majority";
console.log("Connecting via SRV to:", uri);

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    tlsAllowInvalidCertificates: true,
  });
  console.log("Connected successfully to Atlas via SRV!");
  await mongoose.disconnect();
} catch (err) {
  console.error("Mongoose SRV connection failed!");
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
