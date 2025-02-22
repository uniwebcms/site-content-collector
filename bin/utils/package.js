// src/utils/version.js
import fs from "node:fs/promises";
import { version } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function getPackageData() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packagePath = path.resolve(__dirname, "../../package.json");
    const packageData = await fs.readFile(packagePath, "utf8");
    return JSON.parse(packageData);
  } catch (error) {
    // Fallback version if we can't read the package.json
    return { version: "0.0.0" };
  }
}
