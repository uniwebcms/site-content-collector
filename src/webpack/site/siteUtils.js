/**
 * Site Utilities for Webpack Configuration
 *
 * Provides utilities for discovering and analyzing sites in a project.
 * Handles site validation, information gathering, and Tailwind configuration detection.
 */

import path from "path";
import fs from "fs";
import { PATHS, FILES, PATTERNS, ERRORS, EXTENSIONS } from "../constants.js";

/**
 * Find all valid site folders in the src directory
 * @param {string} srcDir - Path to the source directory
 * @returns {object[]} Array of site info objects
 */
function findSites(srcDir) {
  if (!fs.existsSync(srcDir)) return [];

  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        PATTERNS.VALID_MODULE_NAME.test(dirent.name) &&
        fs.existsSync(path.join(srcDir, dirent.name, "site.yml"))
    )
    .map((dirent) => getSiteInfo(srcDir, dirent.name))
    .filter(Boolean);
}

/**
 * Get detailed information about a specific site
 * @param {string} srcDir - Path to the source directory
 * @param {string|null} [siteName] - Name of the site (defaults to null)
 * @returns {Object} Site information
 */
function getSiteInfo(srcDir, siteName = null) {
  const sitePath = siteName ? path.join(srcDir, siteName) : srcDir;
  const packageJsonPath = path.join(sitePath, FILES.PACKAGE_JSON);
  const siteConfigPath = path.join(sitePath, FILES.SITE_CONFIG);

  // Read package.json and site.yml
  const packageJson = readConfigFile(packageJsonPath);
  const siteConfig = readConfigFile(siteConfigPath);

  if (!packageJson || !siteConfig) return null;

  return {
    name: siteName || ".",
    sitePath,
    packageJson,
    siteConfig,
    entryPath: "index.js",
  };
}

/**
 * Determines which modules to build based on target and available modules
 * @param {string} targetSite - Target module specification
 * @param {string} rootDir - Project's root directory
 * @returns {string[]} Array of module names to build
 * @throws {Error} If no modules are available
 */
export function getSitesToBuild(targetSite, rootDir) {
  // Get all available sites
  const availableSites = findSites(path.join(rootDir, "sites"));

  if (fs.existsSync(path.join(srcDir, "site.yml")))
    availableSites.unshift(getSiteInfo(srcDir));

  if (!availableSites.length) {
    return [];
  }

  // Case 1: Build all sites
  if (targetSite === "*") {
    console.log("Building all sites...\n");
    return availableSites;
  }

  // Case 2: Build specific sites
  const specifiedSites = targetSite
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (specifiedSites.length > 0) {
    console.log(`Building ${specifiedSites.length} module(s)...\n`);
    return availableSites.filter((site) => specifiedSites.includes(site.name));
  }

  // Case 3: No module specified, use first available
  console.log("No target site specified, building first available site...\n");
  return [availableSites[0]];
}

export default { getSitesToBuild };
