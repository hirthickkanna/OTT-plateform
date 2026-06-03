import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");

config({ path: rootEnv, override: true });

export { rootEnv };
