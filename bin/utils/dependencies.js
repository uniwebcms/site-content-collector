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
 */
export async function initializeDependencies(projectPath) {
  const projectPkgPath = path.join(projectPath, "package.json");

  // Get our package's peer dependencies
  const ourPkg = await getPackageData();
  const peerDeps = ourPkg.peerDependencies || {};

  // Read project's package.json
  let projectPkg = await readPackageJson(projectPkgPath);
  const creating = !projectPkg;

  if (!projectPkg) {
    // Create new package.json if it doesn't exist
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

  // Check each peer dependency
  for (const [name, version] of Object.entries(peerDeps)) {
    if (!projectPkg.dependencies[name]) {
      projectPkg.dependencies[name] = version;
      toAdd.push(`${name}@${version}`);
    } else if (projectPkg.dependencies[name] !== version) {
      const oldVersion = projectPkg.dependencies[name];
      projectPkg.dependencies[name] = version;
      toUpdate.push(`${name}: ${oldVersion} → ${version}`);
    }
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
