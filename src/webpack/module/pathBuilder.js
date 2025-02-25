/**
 * Path and URL Builder for Webpack Configuration
 *
 * Manages all path-related configurations including:
 * - Build output paths
 * - Public URLs
 * - Environment-specific paths
 * - Tunnel URL handling
 */

import path from "path";
import fs from "fs";
import { URL } from "url";

import {
  BUILD_MODES,
  PATHS,
  FILES,
  ERRORS,
  DEFAULTS,
  LIFECYCLE_EVENTS,
} from "../constants.js";

/**
 * Validates and normalizes URLs
 * @param {string} url - URL to validate
 * @returns {string|false} Normalized URL or false if invalid
 */
function validUrl(url) {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    const href = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    return href.endsWith("/") ? href.slice(0, -1) : href;
  } catch (error) {
    console.log(`Invalid URL '${url}'`);
    console.log(error);
    return false;
  }
}

/**
 * Determines base directory based on environment
 * @param {Object} options - Directory options
 * @returns {string} Base directory path
 */
function getBaseDirectory(context) {
  const { lifecycleEvent, mode, distDir, buildDevDir } = context;

  switch (lifecycleEvent) {
    case LIFECYCLE_EVENTS.BUILD:
    case LIFECYCLE_EVENTS.BUILD_DEV:
      return distDir;

    case LIFECYCLE_EVENTS.WATCH_TUNNEL:
    case LIFECYCLE_EVENTS.DEV:
    case LIFECYCLE_EVENTS.WATCH_LOCAL:
      return buildDevDir;

    case LIFECYCLE_EVENTS.BUILD_PROD:
    case LIFECYCLE_EVENTS.BUILD_PROD_COMMIT:
      return distDir;

    case LIFECYCLE_EVENTS.BUILD_PROD_COPY:
    case LIFECYCLE_EVENTS.BUILD_PROD_COPY_COMMIT:
      return buildDevDir;

    default:
      return mode === BUILD_MODES.PRODUCTION ? distDir : buildDevDir;
  }
}

/**
 * Gets tunnel URL for local development
 * @param {Object} options - Tunnel options
 * @returns {string|null} Tunnel URL
 * @throws {Error} If tunnel URL is required but not available
 */
function getTunnelUrl({ tunnelUrl, buildDevDir }) {
  let url = validUrl(tunnelUrl);
  if (url) return url;

  try {
    const tunnelFilePath = path.join(buildDevDir, FILES.TUNNEL_URL);
    if (fs.existsSync(tunnelFilePath)) {
      url = validUrl(fs.readFileSync(tunnelFilePath, "utf-8").trim());
      if (url) return url;
    }
  } catch (error) {
    console.warn("Error reading tunnel URL file:", error);
  }

  return null;
}

/**
 * Gets public path based on environment
 * @param {Object} options - Path options
 * @returns {string} Public path URL
 * @throws {Error} If required URLs are missing
 */
function getPublicPath({
  mode,
  isTunnel,
  moduleName,
  buildId,
  env,
  buildDevDir,
  variant = "",
}) {
  const variantPath = variant ? `_${variant}` : "";
  const modulePathSegment = `${moduleName}/${buildId}${variantPath}/`;

  // Production mode - use Cloudflare, GitHub Pages, or custom URL
  if (mode === BUILD_MODES.PRODUCTION) {
    let publicUrl =
      validUrl(env.CF_PAGES_URL) ||
      validUrl(env.GH_PAGES_URL) ||
      validUrl(env.PUBLIC_URL);

    if (!publicUrl) {
      // context.serverPort
      publicUrl = `http://localhost:${env.port || 3000}`;
      // throw new Error(ERRORS.NO_PUBLIC_URL);
    }
    console.log("publicUrl:", publicUrl);

    return `${publicUrl}/${modulePathSegment}`;
  }

  // Tunnel mode - use tunnel URL for remote testing
  if (isTunnel) {
    const tunnelUrl = getTunnelUrl({ tunnelUrl: env.TUNNEL_URL, buildDevDir });
    if (!tunnelUrl) {
      throw new Error(ERRORS.MISSING_TUNNEL_URL);
    }
    return `${tunnelUrl}/${modulePathSegment}`;
  }

  // Development mode - use localhost
  const port = env.DEV_SERVER_PORT || DEFAULTS.DEV_SERVER_PORT;
  return `${DEFAULTS.PUBLIC_URL}:${port}/${modulePathSegment}`;
}

/**
 * Gets output path configuration
 * @param {Object} options - Output options
 * @returns {Object} Output path configuration
 */
function getOutputPath({ baseDir, moduleInfo, buildId, variant = "" }) {
  const moduleDir = path.resolve(baseDir, moduleName);
  const variantPath = variant ? `_${variant}` : "";

  return {
    path: path.join(moduleInfo.modulePath, `${buildId}${variantPath}`),
    moduleDir,
  };
}

/**
 * Gets complete path configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Complete path configuration
 */
export function getPathConfig({ moduleInfo, context, buildId, variant }) {
  const baseDir = getBaseDirectory(context);
  const variantPath = variant ? `_${variant}` : "";

  const outputPath = path.join(
    moduleInfo.modulePath,
    `${buildId}${variantPath}`
  );

  const publicPath = getPublicPath({
    ...options,
    buildDevDir: options.buildDevDir,
  });

  return {
    baseDir,
    outputPath,
    publicPath,
  };
}

export default {
  getPathConfig,
  validUrl,
  getBaseDirectory,
  getTunnelUrl,
  getPublicPath,
};
