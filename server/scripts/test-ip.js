import http from "http";
import https from "https";

function fetchIP(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data.trim()));
    }).on("error", reject);
  });
}

try {
  const ipv64 = await fetchIP("https://api64.ipify.org");
  console.log("Public IP (api64):", ipv64);
} catch (e) {
  console.error("Error fetching api64:", e.message);
}

try {
  const ipv4 = await fetchIP("https://api.ipify.org");
  console.log("Public IP (api4):", ipv4);
} catch (e) {
  console.error("Error fetching api4:", e.message);
}
