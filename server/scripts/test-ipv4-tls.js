import tls from "tls";
import dns from "dns/promises";

const hostnames = [
  "ac-cxvihu9-shard-00-00.tqu37wb.mongodb.net",
  "ac-cxvihu9-shard-00-01.tqu37wb.mongodb.net",
  "ac-cxvihu9-shard-00-02.tqu37wb.mongodb.net"
];

for (const host of hostnames) {
  console.log(`\n--- Testing TLS over IPv4 for ${host} ---`);
  
  try {
    const aRecords = await dns.resolve4(host);
    const ip = aRecords[0];
    console.log(`Resolved IPv4: ${ip}`);
    
    console.log(`Doing TLS handshake to IPv4 ${ip} on port 27017 (servername: ${host})...`);
    
    const socket = tls.connect({
      host: ip,
      port: 27017,
      servername: host,
      rejectUnauthorized: false
    }, () => {
      console.log(`SUCCESS: TLS connected to IPv4 ${ip} on port 27017`);
      console.log(`  Protocol: ${socket.getProtocol()}`);
      console.log(`  Authorized: ${socket.authorized}`);
      socket.destroy();
    });
    
    socket.setTimeout(4000);
    
    socket.on("timeout", () => {
      console.error(`TIMEOUT: TLS handshake to IPv4 ${ip} timed out`);
      socket.destroy();
    });
    
    socket.on("error", (e) => {
      console.error(`ERROR: TLS handshake to IPv4 ${ip} failed:`, e.message);
      socket.destroy();
    });
  } catch (err) {
    console.error(`dns.resolve4 error for ${host}:`, err.message);
  }
}
