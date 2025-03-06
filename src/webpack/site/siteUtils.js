/**
 * Site Utilities for Webpack Configuration
 *
 * Provides utilities for discovering and analyzing sites in a project.
 * Handles site validation, information gathering, and Tailwind configuration detection.
 */

import path from "path";
import fs from "fs";
import { PATHS, FILES, PATTERNS, ERRORS, EXTENSIONS } from "../constants.js";
import { readConfigFile } from "../fileUtils.js";
import { loadSiteConfig } from "./site-config-loader.js";

// /**
//  * Find all valid site folders in the src directory
//  * @param {string} srcDir - Path to the source directory
//  * @returns {object[]} Array of site info objects
//  */
// function findSites(srcDir) {
//   if (!fs.existsSync(srcDir)) return [];

//   return fs
//     .readdirSync(srcDir, { withFileTypes: true })
//     .filter(
//       (dirent) =>
//         dirent.isDirectory() &&
//         PATTERNS.VALID_MODULE_NAME.test(dirent.name) &&
//         fs.existsSync(path.join(srcDir, dirent.name, "site.yml"))
//     )
//     .map(async (dirent) => await getSiteInfo(srcDir, dirent.name))
//     .filter(Boolean);
// }

/**
 * Find all valid site directories and return their information
 * @param {string} srcDir - Source directory to search for sites
 * @param {Object} context - Build context
 * @returns {Promise<Array>} - Array of site information objects
 */
async function findSites(srcDir, context) {
  const { log } = context;

  try {
    if (!fs.existsSync(srcDir)) {
      log(`Directory doesn't exist: ${srcDir}`);
      return [];
    }

    log(`Scanning directory: ${srcDir}`);
    const dirents = fs.readdirSync(srcDir, { withFileTypes: true });
    log(`Found ${dirents.length} entries in directory`);

    // Make sure PATTERNS is defined
    if (!PATTERNS || !PATTERNS.VALID_MODULE_NAME) {
      console.error("Error: PATTERNS.VALID_MODULE_NAME is not defined");
      return [];
    }

    // Filter directories synchronously
    const validDirents = dirents.filter(
      (dirent) =>
        dirent.isDirectory() &&
        PATTERNS.VALID_MODULE_NAME.test(dirent.name) &&
        fs.existsSync(path.join(srcDir, dirent.name, "site.yml"))
    );

    if (validDirents.length === 0) {
      log("No valid site directories found");
      return [];
    }

    // Process site info (getSiteInfo is still async)
    // log(`Processing ${validDirents.length} sites`);
    const sitesPromises = validDirents.map((dirent) =>
      getSiteInfo(srcDir, dirent.name, context)
    );

    const sites = await Promise.all(sitesPromises);
    return sites.filter(Boolean);
  } catch (error) {
    console.error("Error finding sites:", error);
    return [];
  }
}

/**
 * Get detailed information about a specific site
 * @param {string} srcDir - Path to the source directory
 * @param {string|null} [siteName] - Name of the site (defaults to null)
 * @returns {Object} Site information
 */
async function getSiteInfo(srcDir, siteName, context) {
  const sitePath = siteName ? path.join(srcDir, siteName) : srcDir;
  const packageJsonPath = path.join(sitePath, FILES.PACKAGE_JSON);
  // const siteConfigPath = path.join(sitePath, FILES.SITE_CONFIG);

  // Read package.json and site.yml
  const packageJson = readConfigFile(packageJsonPath);
  // const siteConfig = readConfigFile(siteConfigPath);
  const siteConfig = await loadSiteConfig(sitePath, context);

  if (!packageJson || !siteConfig) return null;

  return {
    siteName,
    sitePath,
    packageJson,
    siteConfig,
    // entryPath: path.join(sitePath, `src/index.js`),
  };
}

// /**
//  * Determines which modules to build based on target and available modules
//  * @param {string} targetSite - Target module specification
//  * @param {string} rootDir - Project's root directory
//  * @returns {string[]} Array of module names to build
//  * @throws {Error} If no modules are available
//  */
// export function getSitesToBuild(targetSite, rootDir) {
//   // Get all available sites
//   const availableSites = findSites(path.join(rootDir, "sites"));

//   if (fs.existsSync(path.join(rootDir, "site.yml")))
//     availableSites.unshift(getSiteInfo(rootDir));

//   if (!availableSites.length) {
//     return [];
//   }

//   // Case 1: Build all sites
//   if (targetSite === "*") {
//     console.log("Building all sites...\n");
//     return availableSites;
//   }

//   // Case 2: Build specific sites
//   const specifiedSites = targetSite
//     .split(",")
//     .map((name) => name.trim())
//     .filter(Boolean);

//   if (specifiedSites.length > 0) {
//     console.log(`Building ${specifiedSites.length} module(s)...\n`);
//     return availableSites.filter((site) => specifiedSites.includes(site.name));
//   }

//   // Case 3: No module specified, use first available
//   console.log("No target site specified, building first available site...\n");
//   return [availableSites[0]];
// }

/**
 * Determines which sites to build based on the target specification
 * @param {Object} context - Build configuration
 * @returns {Promise<Array>} - Array of site information objects to build
 */
export async function getSitesToBuild(context) {
  const { rootDir, log, targetSites } = context;

  if (!targetSites.length) return [];

  // log(`Finding sites to build with target:`,targetSites);

  // Get all available sites
  const sitesDir = path.join(rootDir, "sites");
  const availableSites = await findSites(sitesDir, context);

  // Check if root directory is also a site (using synchronous fs)
  const rootSiteYmlPath = path.join(rootDir, "site.yml");
  if (fs.existsSync(rootSiteYmlPath)) {
    log("Root directory contains a site.yml, adding as a site");
    const rootSiteInfo = await getSiteInfo(rootDir, null, context);
    if (rootSiteInfo) {
      availableSites.unshift(rootSiteInfo);
    }
  } else {
    log("Root directory is not a site");
  }

  if (!availableSites.length) {
    log("No available sites found");
    return [];
  }

  log(`Found ${availableSites.length} available sites`);

  // Case 1: Build all sites
  if (targetSites[0] === "*") {
    log(`Collected ${availableSites.length} sites`);
    return availableSites;
  }

  // Case 2: Build specific sites
  const sitesToBuild = availableSites.filter((site) =>
    targetSites.includes(site.siteName)
  );

  log(
    `Collected ${sitesToBuild.length} of ${targetSites.length} specified sites`
  );

  // Warn about any specified sites that weren't found
  const foundSiteNames = sitesToBuild.map((site) => site.siteName);
  const missingNames = targetSites.filter(
    (name) => !foundSiteNames.includes(name)
  );

  if (missingNames.length > 0) {
    // Use console.warn for warnings even in debug mode, as these are important
    console.warn(
      `Warning: Could not find the following specified sites: ${missingNames.join(
        ", "
      )}`
    );
  }

  return sitesToBuild;

  // Case 3: No module specified, use first available
  // log(
  //   `No target site specified, collected: ${
  //     availableSites[0].name || "root site"
  //   }`
  // );
  // return [availableSites[0]];
  return [];
}

export default { getSitesToBuild };
