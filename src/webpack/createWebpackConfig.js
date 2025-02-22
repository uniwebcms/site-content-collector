/**
 * Main Webpack Configuration Generator
 *
 * Composes all webpack configuration components into a complete build configuration.
 * Handles multiple build modes, environments, and module variants.
 */

import path from "path";
import { v4 as uuidv4 } from "uuid";

import moduleUtils from "./config/moduleUtils.js";
import pluginBuilder from "./config/pluginBuilder.js";
import loaderBuilder from "./config/loaderBuilder.js";
import pathBuilder from "./config/pathBuilder.js";
import optimizationBuilder from "./config/optimizationBuilder.js";
import devServerBuilder from "./config/devServerBuilder.js";

import { BUILD_MODES, PATHS, ERRORS } from "./constants.js";

/**
 * Creates a webpack configuration for a single module variant
 * @param {Object} params Build parameters
 * @returns {Object} Webpack configuration
 */
function createVariantConfig({
  moduleName,
  context,
  buildId,
  variant = "",
  tailwindConfig = null,
}) {
  const { webpack, env, argv, rootDir, srcDir } = context;
  const mode =
    argv.mode ||
    (env.CF_PAGES_BRANCH === "main"
      ? BUILD_MODES.PRODUCTION
      : BUILD_MODES.DEVELOPMENT);
  const isProduction = mode === BUILD_MODES.PRODUCTION;

  // Get paths configuration
  const paths = pathBuilder.getPathConfig({
    mode,
    moduleName,
    buildId,
    variant,
    env,
    argv,
    ...context,
    lifecycleEvent: env.npm_lifecycle_event,
  });

  // Get module information and exposed components
  const moduleInfo = moduleUtils.getModuleInfo(srcDir, moduleName);
  const exposes = moduleUtils.getModuleFederationExposes(srcDir, moduleName);

  return {
    name: variant ? `${moduleName}-${variant}` : moduleName,
    mode,

    // Entry configuration
    entry: moduleInfo.entryPath,

    // Output configuration
    output: {
      path: paths.outputPath,
      publicPath: paths.publicPath,
      filename: "[name].[contenthash].js",
      clean: true,
    },

    // Module resolution
    resolve: {
      extensions: [".jsx", ".js", ".json"],
      alias: {
        "@": srcDir,
      },
    },

    // Loaders
    module: {
      rules: loaderBuilder.getLoaderRules({
        isProduction,
        tailwindConfig,
      }),
    },

    // Plugins
    plugins: pluginBuilder.getPlugins({
      mode,
      moduleName,
      srcDir,
      publicPath: paths.publicPath,
      outputPath: paths.outputPath,
      buildId,
      exposes,
      packageJson: moduleInfo.packageJson,
      variant,
      userPlugins: context.userPlugins,
    }),

    // Optimization and performance
    ...optimizationBuilder.getBuildOptimizations({
      mode,
      rootDir,
      configPath: moduleInfo.entryPath,
    }),

    // Development server
    ...(isProduction
      ? {}
      : {
          devServer: devServerBuilder.getDevServerConfig({
            port: parseInt(argv.port) || env.DEV_SERVER_PORT,
            buildDevDir: context.buildDevDir,
            publicPath: paths.publicPath,
          }),
        }),

    // Build reporting
    stats: isProduction ? "normal" : "minimal",
  };
}

/**
 * Creates a webpack configuration for a module
 * @param {Object} params Module parameters
 * @returns {Object|Array} Webpack configuration(s)
 */
function buildModuleConfig({ moduleName, context }) {
  // Generate unique build identifier
  const buildId = uuidv4();

  // Validate module
  moduleUtils.validateModule(context.srcDir, moduleName);

  // Get Tailwind configurations
  const tailwindConfigs = moduleUtils.findTailwindConfigFiles(
    path.resolve(context.srcDir, moduleName)
  );

  // Create configurations for each Tailwind variant (or single config if no variants)
  const configs = (
    tailwindConfigs.length > 1 ? tailwindConfigs : [{ path: null, kind: "" }]
  ).map(({ path: tailwindConfig, kind: variant }) =>
    createVariantConfig({
      moduleName,
      context,
      buildId,
      variant,
      tailwindConfig,
    })
  );

  return configs.length === 1 ? configs[0] : configs;
}

/**
 * Determines which modules to build based on target and available modules
 * @param {string} targetModule - Target module specification
 * @param {string} srcDir - Source directory
 * @returns {string[]} Array of module names to build
 * @throws {Error} If no modules are available
 */
function getModulesToBuild(targetModule, srcDir) {
  // Get all available modules
  const availableModules = moduleUtils.findModules(srcDir);
  if (!availableModules.length) {
    throw new Error(ERRORS.NO_MODULES);
  }

  // Case 1: Build all modules
  if (targetModule === "*") {
    console.log("Building all modules...\n");
    return availableModules;
  }

  // Case 2: Build specific modules
  const specifiedModules = targetModule.split(",").filter(Boolean);
  if (specifiedModules.length > 0) {
    console.log(`Building ${specifiedModules.length} module(s)...\n`);
    return specifiedModules.map((name) => name.trim());
  }

  // Case 3: No module specified, use first available
  console.log(
    "No target module specified, building first available module...\n"
  );
  return [availableModules[0]];
}

/**
 * Creates complete webpack configuration
 */
export default function createWebpackConfig(
  webpack,
  argv,
  rootDir,
  userPlugins = []
) {
  // Setup build context
  const context = {
    webpack,
    env: process.env,
    argv,
    rootDir,
    srcDir: path.resolve(rootDir, PATHS.SRC),
    distDir: path.resolve(rootDir, PATHS.DIST),
    buildDevDir: path.resolve(rootDir, PATHS.BUILD_DEV),
    userPlugins,
  };

  try {
    // Determine which modules to build
    const modules = getModulesToBuild(
      process.env.TARGET_MODULE || "*",
      context.srcDir
    );

    // Build configurations for all modules
    const configs = modules.flatMap((moduleName) =>
      buildModuleConfig({ moduleName, context })
    );

    // Return single config or array based on number of configs
    return configs.length === 1 ? configs[0] : configs;
  } catch (error) {
    console.error("Build configuration error:", error);
    throw error;
  }
}
