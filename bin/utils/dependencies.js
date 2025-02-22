// src/utils/dependencies.js
import fs from "node:fs/promises";
import path from "node:path";
import { getPackageData } from "./package.js";
import { logger } from "./logger.js";

/**
 * Read and parse a package.json file
 */
async function readPackageJson(filepath) {
  try {
    const content = await fs.readFile(filepath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write package.json file
 */
async function writePackageJson(filepath, content) {
  await fs.writeFile(filepath, JSON.stringify(content, null, 2) + "\n", "utf8");
}

/**
 * Check if workspace configuration exists and is valid
 */
function validateWorkspaces(pkg) {
  const required = ["modules/*", "sites/*", "src/*"];
  const current = pkg.workspaces || [];

  const missing = required.filter((ws) => !current.includes(ws));
  if (missing.length > 0) {
    return {
      valid: false,
      missing,
    };
  }

  return { valid: true };
}

/**
 * Initialize or update parent project dependencies
 * @param {string} projectPath - Path to the project
 * @param {Object} options - Options object
 * @param {boolean} options.checkOnly - Only check for updates without modifying
 * @param {boolean} options.force - Force update all dependencies to match peer versions
 */
export async function initializeDependencies(projectPath, options = {}) {
  const { checkOnly = false, force = false } = options;
  const projectPkgPath = path.join(projectPath, "package.json");

  // Get our package's peer dependencies
  const ourPkg = await getPackageData();
  const peerDeps = ourPkg.peerDependencies || {};

  // Read project's package.json
  let projectPkg = await readPackageJson(projectPkgPath);
  const creating = !projectPkg;

  if (creating && checkOnly) {
    return {
      needsUpdate: true,
      missing: Object.entries(peerDeps).map(
        ([name, version]) => `${name}@${version}`
      ),
      outdated: [],
    };
  }

  if (!projectPkg) {
    projectPkg = {
      name: path.basename(projectPath),
      version: "0.1.0",
      private: true,
      workspaces: ["modules/*", "sites/*", "src/*"],
      scripts: {
        uniweb: "uniweb",
        dev: "webpack serve --mode development",
        build: "webpack --mode production",
      },
    };
  }

  // Ensure dependencies section exists
  projectPkg.dependencies = projectPkg.dependencies || {};

  // Track what we're going to change
  const toAdd = [];
  const toUpdate = [];
  const outdated = [];
  const missing = [];

  // Check each peer dependency
  for (const [name, version] of Object.entries(peerDeps)) {
    if (!projectPkg.dependencies[name]) {
      missing.push(`${name}@${version}`);
      if (!checkOnly) {
        projectPkg.dependencies[name] = version;
        toAdd.push(`${name}@${version}`);
      }
    } else if (projectPkg.dependencies[name] !== version) {
      const oldVersion = projectPkg.dependencies[name];
      outdated.push(`${name}: ${oldVersion} → ${version}`);
      if (!checkOnly && (force || needsUpdate(oldVersion, version))) {
        projectPkg.dependencies[name] = version;
        toUpdate.push(`${name}: ${oldVersion} → ${version}`);
      }
    }
  }

  // If only checking, return the status
  if (checkOnly) {
    return {
      needsUpdate: missing.length > 0 || outdated.length > 0,
      missing,
      outdated,
    };
  }

  // Check workspaces configuration
  const wsCheck = validateWorkspaces(projectPkg);
  if (!wsCheck.valid) {
    projectPkg.workspaces = ["modules/*", "sites/*", "src/*"];
    logger.warn("Updated workspaces configuration");
  }

  // Write the updated package.json
  await writePackageJson(projectPkgPath, projectPkg);

  // Log what we did
  if (creating) {
    logger.info("Created new package.json with required dependencies");
  } else {
    if (toAdd.length > 0) {
      logger.info("Added dependencies:\n  " + toAdd.join("\n  "));
    }
    if (toUpdate.length > 0) {
      logger.info("Updated dependencies:\n  " + toUpdate.join("\n  "));
    }
    if (toAdd.length === 0 && toUpdate.length === 0) {
      logger.info("All dependencies are up to date");
    }
  }

  return {
    created: creating,
    added: toAdd,
    updated: toUpdate,
  };
}

/**
 * Check if a version needs to be updated based on semver
 * This is a simple implementation - you might want to use a proper semver library
 */
function needsUpdate(currentVersion, peerVersion) {
  // Remove ^ or ~ from versions
  const current = currentVersion.replace(/[\^~]/, "");
  const peer = peerVersion.replace(/[\^~]/, "");

  // Split into parts
  const [currentMajor, currentMinor = 0, currentPatch = 0] = current
    .split(".")
    .map(Number);
  const [peerMajor, peerMinor = 0, peerPatch = 0] = peer.split(".").map(Number);

  // Compare versions
  if (currentMajor !== peerMajor) return true;
  if (currentMinor < peerMinor) return true;
  if (currentMinor === peerMinor && currentPatch < peerPatch) return true;

  return false;
}
