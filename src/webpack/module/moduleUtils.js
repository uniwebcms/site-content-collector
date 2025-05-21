/**
 * Module Utilities for Webpack Configuration
 *
 * Provides utilities for discovering and analyzing modules in a project.
 * Handles module validation, information gathering, and Tailwind configuration detection.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { PATHS, FILES, PATTERNS, ERRORS, EXTENSIONS } from "../constants.js";
import fileUtils from "../fileUtils.js";

// /**
//  * Find all valid module folders in the src directory
//  * @param {string} srcDir - Path to the source directory
//  * @returns {string[]} Array of module names
//  */
// export function findModules(srcDir) {
//   return fs
//     .readdirSync(srcDir, { withFileTypes: true })
//     .filter(
//       (dirent) =>
//         dirent.isDirectory() && PATTERNS.VALID_MODULE_NAME.test(dirent.name)
//     )
//     .map((dirent) => dirent.name);
// }

/**
 * Find all valid module folders in the src directory
 * @param {string} srcDir - Path to the source directory
 * @returns {object[]} Array of module info objects
 */
function findModules(srcDir) {
  // console.log("srcDir", srcDir);
  if (!existsSync(srcDir)) return [];

  return readdirSync(srcDir, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        PATTERNS.VALID_MODULE_NAME.test(dirent.name) &&
        existsSync(path.join(srcDir, dirent.name, "package.json")) //
    )
    .map((dirent) => getModuleInfo(srcDir, dirent.name))
    .filter(Boolean);
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
  const moduleConfigPath = path.join(modulePath, FILES.MODULE_CONFIG);

  // Read package.json and module.yml
  const packageJson = fileUtils.readConfigFile(packageJsonPath); // ?? { dependencies: {} };
  if (!packageJson) return null;

  const moduleConfig = fileUtils.readConfigFile(moduleConfigPath);

  // if (!packageJson || !moduleConfig) return null;

  // Find entry point (supports both .js and .jsx)
  const jsEntry = path.join(modulePath, `${FILES.ENTRY}.js`);
  const jsxEntry = path.join(modulePath, `${FILES.ENTRY}.jsx`);

  const entryPath = existsSync(jsEntry)
    ? jsEntry
    : existsSync(jsxEntry)
    ? jsxEntry
    : null;

  const tailwindConfigs = findTailwindConfigFiles(modulePath);
  const exposes = getModuleFederationExposes(srcDir, moduleName);

  return {
    name: moduleName,
    // srcDir,
    modulePath,
    packageJson,
    moduleConfig,
    entryPath,
    tailwindConfigs,
    exposes,
    // hasPackageJson: existsSync(packageJsonPath),
  };
}

/**
 * Find all Tailwind configuration files for a module
 * @param {string} moduleDir - Path to the module directory
 * @returns {Array<{path: string, kind: string}>} Array of config paths and their variants
 */
export function findTailwindConfigFiles(moduleDir) {
  const configFiles = readdirSync(moduleDir);

  return configFiles
    .filter((file) => PATTERNS.TAILWIND_CONFIG.test(file))
    .map((file) => {
      const match = file.match(PATTERNS.TAILWIND_CONFIG);
      return match
        ? {
            name: file,
            // path: path.resolve(moduleDir, file),
            kind: match[1] || "",
          }
        : null;
    })
    .filter(Boolean);
}

// /**
//  * Get exposed components configuration for module federation
//  * @param {string} modulePath - Path to the module
//  * @param {string} [prefix=''] - Optional prefix for component paths
//  * @returns {Object} Mapping of expose paths to component paths
//  */
// export function getExposedComponents(modulePath, prefix = "") {
//   const componentsPath = path.join(modulePath, PATHS.COMPONENTS);
//   if (!existsSync(componentsPath)) return {};

//   const components = {};
//   readdirSync(componentsPath)
//     .filter((file) => EXTENSIONS.JAVASCRIPT.some((ext) => file.endsWith(ext)))
//     .forEach((file) => {
//       const componentName = file.replace(/\.[^.]+$/, "");
//       const exposePath = prefix
//         ? `./${prefix}/${componentName}`
//         : `./${componentName}`;
//       components[exposePath] = path.join(componentsPath, file);
//     });

//   return components;
// }

/**
 * Get the federation expose configuration for a module
 * @param {string} srcDir - Path to the source directory
 * @param {string} moduleName - Name of the module
 * @returns {Object} Module Federation expose configuration
 */
function getModuleFederationExposes(srcDir, moduleName) {
  const baseDir = path.basename(srcDir);

  return {
    "./widgets": `./${baseDir}/${moduleName}`,
    // ...getExposedComponents(path.resolve(srcDir, moduleName), PATHS.COMPONENTS),
  };
}

// /**
//  * Validate if a module exists and is properly configured
//  * @param {string} srcDir - Path to the source directory
//  * @param {string} moduleName - Name of the module to validate
//  * @throws {Error} If module is invalid or missing
//  */
// export function validateModule(srcDir, moduleName) {
//   const moduleInfo = getModuleInfo(srcDir, moduleName);

//   if (!existsSync(moduleInfo.modulePath)) {
//     throw new Error(`${ERRORS.INVALID_MODULE} ${moduleName}`);
//   }

//   if (!moduleInfo.entryPath) {
//     throw new Error(`${ERRORS.MISSING_ENTRY} ${moduleName}`);
//   }
// }

async function refreshDynamicExports(moduleInfo) {
  const { modulePath } = moduleInfo;
  const componentsDir = path.join(modulePath, "components");
  const outputFile = path.join(modulePath, "dynamicExports.js");

  // Read all component directories
  const componentDirs = await fs.readdir(componentsDir);

  // Process component directories in parallel
  const results = await Promise.all(
    componentDirs.map(async (componentDir) => {
      const absDir = path.join(componentsDir, componentDir);
      const indexPath = path.join(absDir, "index.js");
      const configPath = path.join(absDir, "component.config.js");

      // Check if both files exist
      const [indexExists, configExists] = await Promise.all([
        fs
          .access(indexPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(configPath)
          .then(() => true)
          .catch(() => false),
      ]);

      if (indexExists && configExists) {
        try {
          const config = await fileUtils.loadConfig(configPath);
          if (config && config.export !== false) {
            return componentDir;
          }
        } catch (error) {
          console.error(`Error processing config for ${componentDir}:`, error);
        }
      }
      return null;
    })
  );

  // Filter out null values and collect exported components
  const exportedComponents = results.filter(Boolean);

  // Generate the content for dynamicExports.js
  let newContent = `// WARNING: This file is auto-generated. DO NOT EDIT MANUALLY.\n`;

  newContent += exportedComponents
    .map(
      (component) =>
        `export { default as ${component} } from './components/${component}/index.js';`
    )
    .join("\n");

  // Check if the file exists and read its content
  const oldContent = await fs.readFile(outputFile, "utf8").catch(() => "");

  // Write the content to the output file
  if (newContent !== oldContent) {
    await fs.writeFile(outputFile, newContent);
    console.log(
      `${exportedComponents.length} exported components for ${moduleInfo.name}.`
    );
  }
}

// function generateExports(srcDir, moduleDir = null) {
//   if (moduleDir) {
//     generateModuleExports(srcDir, moduleDir);
//   } else {
//     // Read all module directories
//     readdirSync(srcDir).forEach((moduleDir) => {
//       generateModuleExports(srcDir, moduleDir);
//     });
//   }
// }

/**
 * Determines which modules to build based on target and available modules
 * @returns {string[]} Array of module names to build
 */
function getModulesToBuild(context) {
  const { targetModules, rootDir } = context;

  if (!targetModules.length) return [];

  // Get all available modules
  const availableModules = [
    ...findModules(path.join(rootDir, "src")),
    ...findModules(path.join(rootDir, "modules")),
  ];

  if (!availableModules.length) {
    return [];
    // throw new Error(ERRORS.NO_MODULES);
  }

  // Case 1: Build all modules
  if (targetModules[0] === "*") {
    console.log(`Building all ${availableModules.length} modules...`);
    return availableModules;
  }

  // Case 2: Build specific modules
  console.log(`Building ${targetModules.length} module(s)...`);
  return availableModules.filter((module) =>
    targetModules.includes(module.name)
  );
}

export default {
  // findModules,
  getModulesToBuild,
  getModuleInfo,
  findTailwindConfigFiles,
  // getExposedComponents,
  // getModuleFederationExposes,
  // validateModule,
  refreshDynamicExports,
};
