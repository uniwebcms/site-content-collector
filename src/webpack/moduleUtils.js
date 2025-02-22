/**
 * Module Utilities for Webpack Configuration
 *
 * Provides utilities for discovering and analyzing modules in a project.
 * Handles module validation, information gathering, and Tailwind configuration detection.
 */

import path from "path";
import fs from "fs";
import { PATHS, FILES, PATTERNS, ERRORS, EXTENSIONS } from "./constants.js";

/**
 * Find all valid module folders in the src directory
 * @param {string} srcDir - Path to the source directory
 * @returns {string[]} Array of module names
 */
export function findModules(srcDir) {
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() && PATTERNS.VALID_MODULE_NAME.test(dirent.name)
    )
    .map((dirent) => dirent.name);
}

/**
 * Get detailed information about a specific module
 * @param {string} srcDir - Path to the source directory
 * @param {string} moduleName - Name of the module
 * @returns {Object} Module information
 */
export function getModuleInfo(srcDir, moduleName) {
  const modulePath = path.resolve(srcDir, moduleName);
  const packageJsonPath = path.join(modulePath, FILES.PACKAGE_JSON);

  // Read package.json if it exists
  let packageJson = { dependencies: {} };
  try {
    if (fs.existsSync(packageJsonPath)) {
      const packageData = fs.readFileSync(packageJsonPath, "utf8");
      packageJson = JSON.parse(packageData);
    }
  } catch (error) {
    console.warn(
      `Warning: Could not parse ${FILES.PACKAGE_JSON} for module ${moduleName}`,
      error
    );
  }

  // Find entry point (supports both .js and .jsx)
  const jsEntry = path.join(modulePath, `${FILES.ENTRY}.js`);
  const jsxEntry = path.join(modulePath, `${FILES.ENTRY}.jsx`);

  const entryPath = fs.existsSync(jsEntry)
    ? jsEntry
    : fs.existsSync(jsxEntry)
    ? jsxEntry
    : null;

  return {
    name: moduleName,
    modulePath,
    packageJson,
    entryPath,
    hasPackageJson: fs.existsSync(packageJsonPath),
  };
}

/**
 * Find all Tailwind configuration files for a module
 * @param {string} moduleDir - Path to the module directory
 * @returns {Array<{path: string, kind: string}>} Array of config paths and their variants
 */
export function findTailwindConfigFiles(moduleDir) {
  const configFiles = fs.readdirSync(moduleDir);

  return configFiles
    .filter((file) => PATTERNS.TAILWIND_CONFIG.test(file))
    .map((file) => {
      const match = file.match(PATTERNS.TAILWIND_CONFIG);
      return match
        ? { path: path.resolve(moduleDir, file), kind: match[1] || "" }
        : null;
    })
    .filter(Boolean);
}

/**
 * Get exposed components configuration for module federation
 * @param {string} modulePath - Path to the module
 * @param {string} [prefix=''] - Optional prefix for component paths
 * @returns {Object} Mapping of expose paths to component paths
 */
export function getExposedComponents(modulePath, prefix = "") {
  const componentsPath = path.join(modulePath, PATHS.COMPONENTS);
  if (!fs.existsSync(componentsPath)) return {};

  const components = {};
  fs.readdirSync(componentsPath)
    .filter((file) => EXTENSIONS.JAVASCRIPT.some((ext) => file.endsWith(ext)))
    .forEach((file) => {
      const componentName = file.replace(/\.[^.]+$/, "");
      const exposePath = prefix
        ? `./${prefix}/${componentName}`
        : `./${componentName}`;
      components[exposePath] = path.join(componentsPath, file);
    });

  return components;
}

/**
 * Get the federation expose configuration for a module
 * @param {string} srcDir - Path to the source directory
 * @param {string} moduleName - Name of the module
 * @returns {Object} Module Federation expose configuration
 */
export function getModuleFederationExposes(srcDir, moduleName) {
  return {
    "./widgets": `./src/${moduleName}`,
    ...getExposedComponents(path.resolve(srcDir, moduleName), PATHS.COMPONENTS),
  };
}

/**
 * Validate if a module exists and is properly configured
 * @param {string} srcDir - Path to the source directory
 * @param {string} moduleName - Name of the module to validate
 * @throws {Error} If module is invalid or missing
 */
export function validateModule(srcDir, moduleName) {
  const moduleInfo = getModuleInfo(srcDir, moduleName);

  if (!fs.existsSync(moduleInfo.modulePath)) {
    throw new Error(`${ERRORS.INVALID_MODULE} ${moduleName}`);
  }

  if (!moduleInfo.entryPath) {
    throw new Error(`${ERRORS.MISSING_ENTRY} ${moduleName}`);
  }
}

export default {
  findModules,
  getModuleInfo,
  findTailwindConfigFiles,
  getExposedComponents,
  getModuleFederationExposes,
  validateModule,
};
