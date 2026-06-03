import dns from "dns/promises";

const srvDomain = "_mongodb._tcp.ac-cxvihu9.tqu37wb.mongodb.net";

try {
  const srvRecords = await dns.resolveSrv(srvDomain);
  console.log("SRV Records:", srvRecords);
} catch (e) {
  console.error("SRV resolution failed:", e.message);
}

try {
  const txtRecords = await dns.resolveTxt("ac-cxvihu9.tqu37wb.mongodb.net");
  console.log("TXT Records (replicaSet details):", txtRecords);
} catch (e) {
  console.error("TXT resolution failed:", e.message);
}
