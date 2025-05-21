/**
 * Main Webpack Configuration Generator
 *
 * Composes all webpack configuration components into a complete build configuration.
 * Handles multiple build modes, environments, and module variants.
 */

import path from "path";
import { fileURLToPath } from "url";
import fileUtils from "./fileUtils.js";
import moduleUtils from "./module/moduleUtils.js";
import buildUtils from "./buildUtils.js";
import { PATHS, FILES, BUILD_MODES } from "./constants.js";
import { logger } from "../logger.js";

function getBuildMode(argv) {
  if (argv.mode && Object.values(BUILD_MODES).includes(argv.mode))
    return argv.mode;

  const isMainBranch = process.env.CF_PAGES_BRANCH === "main";

  return isMainBranch ? BUILD_MODES.PRODUCTION : BUILD_MODES.DEVELOPMENT;
}

function splitNames(names) {
  return names
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * Generates webpack configuration objects with predefined settings and plugins.
 *
 * @param {object} webpack - The webpack instance to use for plugin creation
 * @param {object} argv - Webpack CLI arguments object
 * @param {string} argv.mode - Build mode ('production' or 'development')
 * @param {number} [argv.port] - Dev server port number
 * @param {string} importMetaUrl - The import.meta.url of the webpack config file
 * @returns {Promise<object>} Webpack configuration object
 * @throws {Error} If rootDir is invalid
 *
 * @example
 * // webpack.config.js
 * import { createConfig } from "@uniwebcms/site-content-collector";
 * import webpack from "webpack";
 *
 * export default async (_, argv) => createConfig(webpack, argv, import.meta.url);
 */
export default async function createWebpackConfig(
  webpack,
  argv,
  importMetaUrl
) {
  const rootDir = path.dirname(fileURLToPath(importMetaUrl));
  if (!rootDir) {
    throw new Error("Invalid root directory");
  }

  const options = await fileUtils.loadConfig(
    path.join(rootDir, FILES.PROJECT_CONFIG)
  );
  console.log("env", argv.env);
  // const { WEBPACK_SERVE = false, site = null, module = null } = argv.env || {};
  const props = argv.env || {};
  const mode = getBuildMode(argv);
  const isProduction = mode === BUILD_MODES.PRODUCTION;
  const relOutDir = isProduction ? PATHS.DIST : PATHS.BUILD_DEV;
  const env = process.env;
  const debug = true;
  const log = debug ? console.log : () => {};
  const userPlugins = options.plugins ?? [];

  // Validate inputs
  if (!Array.isArray(userPlugins)) {
    throw new Error("Project `plugins` must be an array");
  }

  // Prepare the base public URL such that the module's URL
  // is `${basePublicUrl}/${moduleName}/${uuid}/`
  const basePublicUrl = isProduction
    ? fileUtils.getProdBaseUrl(rootDir, argv, env)
    : fileUtils.getDevBaseUrl(rootDir, argv, env);

  const targetSites = splitNames(
    props.site ?? props.sites ?? env.TARGET_SITE ?? "*"
  );

  const targetModules = splitNames(
    props.module ?? props.modules ?? env.TARGET_MODULE ?? "*"
  );

  // Setup build context
  const context = {
    webpack,
    mode,
    isProduction,
    isTunnel: !!argv.tunnel,
    compress: !!argv.compress,
    isServeMode: props.WEBPACK_SERVE, // defined by webpack
    targetSites,
    targetModules,
    rootDir,
    outputDir: path.join(rootDir, relOutDir),
    buildDevDir: path.resolve(rootDir, PATHS.BUILD_DEV),
    userPlugins,
    basePublicUrl,
    debug,
    logger,
    log,
  };

  logger.info(`Building in ${mode} mode...`);
  logger.group();

  // logger.info(`argv`, argv);

  try {
    // Determine which modules to build
    const modules = moduleUtils.getModulesToBuild(context);
    // console.log({ modules });
    // Get the array of module configs (synchronous)
    const moduleConfigs = buildUtils.buildModuleConfigs(modules, context);

    // Tell the site builder which modules are being built
    context.activeModules = modules.map((config) => config.name);

    // Wait for the site configs (async)
    const siteConfigs = await buildUtils.buildSiteConfigs(context);

    // Create the combined config array
    let configs = [...moduleConfigs, ...siteConfigs];

    // Ensure all configs are fully resolved (in case any are Promises)
    configs = await Promise.all(
      configs.map(async (config) => {
        return config instanceof Promise ? await config : config;
      })
    );

    logger.groupEnd();
    logger.info(`Building all ${configs.length} webpack config objects...\n`);

    if (configs.length) {
      // Add server config (synchronous)
      configs[0].devServer = buildUtils.buildServerConfig(argv, context);
      configs[0].watchOptions = {
        ignored: [
          `**/${PATHS.NODE_MODULES}/**`,
          `**/${PATHS.DIST}/**`,
          `**/${PATHS.BUILD_DEV}/**`,
          "**/.git/**",
        ],
        aggregateTimeout: 300,
        poll: false, // Use filesystem events
      };
      // Add server config (synchronous)
      // const serverConfig = buildUtils.buildServerConfig(argv, context);
      // configs.push(serverConfig);
    }

    // Return single config or array based on number of configs
    return configs.length === 1 ? configs[0] : configs;
  } catch (error) {
    console.error("Build configuration error:", error);
    throw error;
  }
}
