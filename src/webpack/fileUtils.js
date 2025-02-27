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

  return new URL(url).toString();
  // try {
  //   url = new URL(url);
  // } catch (error) {
  //   console.log(`Invalid URL:`, url, error);
  //   return null;
  // }

  // const href = `${url.protocol}//${url.hostname}${url.pathname}`;

  // return href.endsWith("/") ? href.slice(0, -1) : href;
}

export function getProdBaseUrl(rootDir, argv, env) {
  let { PUBLIC_URL, CF_PAGES_URL, CF_PAGES_BRANCH, GH_PAGES_URL } = env;

  PUBLIC_URL ??= getDevBaseUrl(rootDir, argv, env);
  PUBLIC_URL = normalizeUrl(PUBLIC_URL);
  CF_PAGES_URL = normalizeUrl(CF_PAGES_URL);
  GH_PAGES_URL = normalizeUrl(GH_PAGES_URL);

  if (CF_PAGES_BRANCH !== "main" && CF_PAGES_BRANCH !== "master")
    CF_PAGES_URL = null;

  return CF_PAGES_URL || GH_PAGES_URL || PUBLIC_URL;
}

export function getDevBaseUrl(rootDir, argv, env) {
  let { TUNNEL_URL, DEV_SERVER_PORT } = env;

  const port = parseInt(argv.port) || DEV_SERVER_PORT || 3000;
  const isTunnel = !!argv.tunnel;

  if (!isTunnel) return normalizeUrl(`http://localhost:${port}`);

  TUNNEL_URL ??= readConfigFile(
    path.join(rootDir, PATHS.BUILD_DEV, "quick-tunnel.txt")
  );

  return normalizeUrl(TUNNEL_URL);
}

export default { getDevBaseUrl, getProdBaseUrl, normalizeUrl, readConfigFile };
