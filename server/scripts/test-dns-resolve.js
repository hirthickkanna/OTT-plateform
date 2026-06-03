import dns from "dns/promises";

const host = "ac-cxvihu9-shard-00-00.tqu37wb.mongodb.net";

try {
  const aRecords = await dns.resolve4(host);
  console.log("resolve4 A records:", aRecords);
} catch (e) {
  console.error("resolve4 failed:", e.message);
}

try {
  const aaaaRecords = await dns.resolve6(host);
  console.log("resolve6 AAAA records:", aaaaRecords);
} catch (e) {
  console.error("resolve6 failed:", e.message);
}

// Let's resolve via Google DNS (8.8.8.8)
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8"]);
try {
  const aGoogle = await resolver.resolve4(host);
  console.log("Google DNS resolve4 A records:", aGoogle);
} catch (e) {
  console.error("Google DNS resolve4 failed:", e.message);
}
