import dns from "dns";
import net from "net";

const hostnames = [
  "ac-cxvihu9-shard-00-00.tqu37wb.mongodb.net",
  "ac-cxvihu9-shard-00-01.tqu37wb.mongodb.net",
  "ac-cxvihu9-shard-00-02.tqu37wb.mongodb.net"
];

for (const host of hostnames) {
  console.log(`\n--- Testing ${host} ---`);
  
  // dns.lookup (uses OS dns config)
  dns.lookup(host, { all: true }, (err, addresses) => {
    if (err) {
      console.error(`dns.lookup error for ${host}:`, err);
    } else {
      console.log(`dns.lookup for ${host}:`, addresses);
      
      // Try connecting to each resolved address
      for (const addr of addresses) {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        
        console.log(`Connecting to ${addr.address} (family: ${addr.family}) on port 27017...`);
        
        socket.on("connect", () => {
          console.log(`SUCCESS: Connected to ${addr.address} on port 27017`);
          socket.destroy();
        });
        
        socket.on("timeout", () => {
          console.error(`TIMEOUT: Connection to ${addr.address} timed out`);
          socket.destroy();
        });
        
        socket.on("error", (e) => {
          console.error(`ERROR: Connection to ${addr.address} failed:`, e.message);
          socket.destroy();
        });
        
        socket.connect(27017, addr.address);
      }
    }
  });
}
