// src/utils/config.js
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { getPackageData } from "./package.js";

/**
 * Create site configuration file
 * @param {string} sitePath Path to the site directory
 * @param {Object} config Configuration object
 * @param {string} config.name Site name
 * @param {string} config.description Site description
 * @param {string} config.template Template used
 * @param {string} config.createdAt Creation timestamp
 */
export async function createSiteConfig(sitePath, config) {
  const configPath = path.join(sitePath, "site.yml");

  // Default configuration with provided values
  const siteConfig = {
    name: config.name,
    description: config.description || "",
    template: config.template || "basic",
    createdAt: config.createdAt || new Date().toISOString(),
    version: "1.0.0",
    build: {
      outDir: "dist",
      assets: "public",
    },
    dev: {
      port: 3000,
      host: "localhost",
    },
  };

  try {
    // Convert to YAML with a 2-space indent
    const yamlString = yaml.dump(siteConfig, {
      indent: 2,
      lineWidth: -1, // Prevent line wrapping
      noRefs: true, // Don't output YAML references
    });
    await fs.writeFile(configPath, yamlString, "utf8");
  } catch (error) {
    throw new Error(`Failed to create site configuration: ${error.message}`);
  }
}

/**
 * Read site configuration
 * @param {string} sitePath Path to the site directory
 * @returns {Promise<Object>} Site configuration
 */
export async function readSiteConfig(sitePath) {
  const configPath = path.join(sitePath, "site.yml");

  try {
    const configFile = await fs.readFile(configPath, "utf8");
    return yaml.load(configFile);
  } catch (error) {
    throw new Error(`Failed to read site configuration: ${error.message}`);
  }
}

/**
 * Update site configuration
 * @param {string} sitePath Path to the site directory
 * @param {Object} updates Configuration updates
 */
export async function updateSiteConfig(sitePath, updates) {
  const config = await readSiteConfig(sitePath);
  const updatedConfig = { ...config, ...updates };

  await createSiteConfig(sitePath, updatedConfig);
}

/**
 * Create site package file
 * @param {string} sitePath Path to the site directory
 * @param {Object} config Configuration object
 * @param {string} config.name Site name
 * @param {string} config.description Site description
 * @param {string} config.template Template used
 * @param {string} config.createdAt Creation timestamp
 */
export async function createSitePackage(sitePath, config) {
  const configPath = path.join(sitePath, "package.json");
  const ownPackage = await getPackageData();

  // Default configuration with provided values
  const siteConfig = {
    name: config.name,
    description: config.description || "",
    // template: config.template || "basic",
    // createdAt: config.createdAt || new Date().toISOString(),
    version: "1.0.0",
    dependencies: ownPackage.peerDependencies,
    // TODO: Add more configuration options as needed
    // build: {
    //   outDir: "dist",
    //   assets: "public",
    // },
    // // Dev server configuration
    // dev: {
    //   port: 3000,
    //   host: "localhost",
    // },
  };

  try {
    await fs.writeFile(configPath, JSON.stringify(siteConfig, null, 2), "utf8");
  } catch (error) {
    throw new Error(`Failed to create site package: ${error.message}`);
  }
}

/**
 * Read site configuration
 * @param {string} sitePath Path to the site directory
 * @returns {Promise<Object>} Site configuration
 */
export async function readSitePackage(sitePath) {
  const configPath = path.join(sitePath, "package.json");

  try {
    const configFile = await fs.readFile(configPath, "utf8");
    return JSON.parse(configFile);
  } catch (error) {
    throw new Error(`Failed to read site configuration: ${error.message}`);
  }
}

/**
 * Update site configuration
 * @param {string} sitePath Path to the site directory
 * @param {Object} updates Configuration updates
 */
export async function updateSitePackage(sitePath, updates) {
  const config = await readSitePackage(sitePath);
  const updatedConfig = { ...config, ...updates };

  await createSitePackage(sitePath, updatedConfig);
}
