import tls from "tls";
import dns from "dns";

const hostnames = [
  "ac-cxvihu9-shard-00-00.tqu37wb.mongodb.net",
  "ac-cxvihu9-shard-00-01.tqu37wb.mongodb.net",
  "ac-cxvihu9-shard-00-02.tqu37wb.mongodb.net"
];

for (const host of hostnames) {
  console.log(`\n--- Testing TLS for ${host} ---`);
  
  dns.lookup(host, { all: true }, (err, addresses) => {
    if (err) {
      console.error(`dns.lookup error:`, err);
      return;
    }
    
    for (const addr of addresses) {
      console.log(`Doing TLS handshake to ${addr.address} on port 27017 (servername: ${host})...`);
      
      const socket = tls.connect({
        host: addr.address,
        port: 27017,
        servername: host,
        rejectUnauthorized: false // we want to see if it even connects and handshakes
      }, () => {
        console.log(`SUCCESS: TLS connected to ${addr.address} on port 27017`);
        console.log(`  Protocol: ${socket.getProtocol()}`);
        console.log(`  Authorized: ${socket.authorized}`);
        if (!socket.authorized) {
          console.log(`  Authorization Error: ${socket.authorizationError}`);
        }
        socket.destroy();
      });
      
      socket.setTimeout(4000);
      
      socket.on("timeout", () => {
        console.error(`TIMEOUT: TLS handshake to ${addr.address} timed out`);
        socket.destroy();
      });
      
      socket.on("error", (e) => {
        console.error(`ERROR: TLS handshake to ${addr.address} failed:`, e.message);
        socket.destroy();
      });
    }
  });
}
