import fs from "fs";
import yaml from "js-yaml";

export function readConfigFile(filename) {
  try {
    if (fs.existsSync(filename)) {
      const data = fs.readFileSync(filename, "utf8");

      if (filename.endsWith(".json")) return JSON.parse(data);
      if (filename.endsWith(".yml")) return yaml.load(data);
      if (filename.endsWith(".txt")) return data;
    }
  } catch (error) {
    // console.warn(
    //   `Warning: Could not parse config file ${filename}`,
    //   error
    // );
    throw new Error(
      `Failed to read configuration file ${filename}: ${error.message}`
    );
  }

  return undefined;
}

export function normalizeUrl(url) {
  if (!url) return "";

  try {
    url = new URL(url);
  } catch (error) {
    console.log(`Invalid URL '${url}'`);
    console.log(error);
    return false;
  }

  const href = `${url.protocol}//${url.hostname}${url.pathname}`;

  return href.endsWith("/") ? href.slice(0, -1) : href;
}
