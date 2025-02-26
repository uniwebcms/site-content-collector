/**
 * Main Webpack Configuration Generator
 *
 * Composes all webpack configuration components into a complete build configuration.
 * Handles multiple build modes, environments, and module variants.
 */

import path from "path";
import { fileURLToPath } from "url";
import fileUtils from "./fileUtils.js";
import buildUtils from "./buildUtils.js";
import { PATHS, BUILD_MODES } from "./constants.js";

function getBuildMode(argv) {
  if (argv.mode && Object.values(BUILD_MODES).includes(argv.mode))
    return argv.mode;

  const isMainBranch = process.env.CF_PAGES_BRANCH === "main";

  return isMainBranch ? BUILD_MODES.PRODUCTION : BUILD_MODES.DEVELOPMENT;
}

/**
 * Generates webpack configuration objects with predefined settings and plugins.
 *
 * @param {object} webpack - The webpack instance to use for plugin creation
 * @param {object} argv - Webpack CLI arguments object
 * @param {string} argv.mode - Build mode ('production' or 'development')
 * @param {number} [argv.port] - Dev server port number
 * @param {string} importMetaUrl - The import.meta.url of the webpack config file
 * @param {Array} userPlugins - Custom plugins to extend functionality. Can be instances
 *                             of CollectorPlugin for content processing or webpack plugins
 *                             for build customization.
 * @returns {Promise<object>} Webpack configuration object
 * @throws {Error} If remote module URL is not configured in site.yml
 * @throws {Error} If userPlugins is not an array
 * @throws {Error} If rootDir is invalid
 *
 * @example
 * // webpack.config.js
 * import { createConfig } from "@uniwebcms/site-content-collector";
 * import webpack from "webpack";
 * import { ImageOptimizerPlugin } from './plugins/image-optimizer';
 * import { CustomWebpackPlugin } from './plugins/webpack-plugin';
 *
 * const plugins = [
 *   new ImageOptimizerPlugin({ quality: 80 }),  // CollectorPlugin for image processing
 *   new CustomWebpackPlugin()                   // Standard webpack plugin
 * ];
 *
 * export default async (_, argv) => createConfig(webpack, argv, import.meta.url, plugins);
 */
export default async function createWebpackConfig(
  webpack,
  argv,
  importMetaUrl,
  userPlugins = []
) {
  // Validate inputs
  if (!Array.isArray(userPlugins)) {
    throw new Error("userPlugins must be an array");
  }

  const rootDir = path.dirname(fileURLToPath(importMetaUrl));
  if (!rootDir) {
    throw new Error("Invalid root directory");
  }

  const mode = getBuildMode(argv);
  const isProduction = mode === BUILD_MODES.PRODUCTION;
  const relOutDir = isProduction ? PATHS.DIST : PATHS.BUILD_DEV;
  const env = process.env;
  const debug = true;
  const log = debug ? console.log : () => {};

  // Prepare the base public URL such that the module's URL
  // is `${basePublicUrl}/${moduleName}/${uuid}/`
  const basePublicUrl = isProduction
    ? fileUtils.getProdBaseUrl(rootDir, argv, env)
    : fileUtils.getDevBaseUrl(rootDir, argv, env);

  // Setup build context
  const context = {
    webpack,
    mode,
    isProduction,
    isTunnel: !!argv.tunnel,
    compress: !!argv.compress,
    rootDir,
    outputDir: path.join(rootDir, relOutDir),
    buildDevDir: path.resolve(rootDir, PATHS.BUILD_DEV),
    userPlugins,
    basePublicUrl,
    debug,
    log,
  };

  log(`Building in ${mode} mode...`);

  try {
    // Get the array of module configs (synchronous)
    const moduleConfigs = buildUtils.buildModuleConfigs(env, context);

    // Wait for the site configs (async)
    const siteConfigs = await buildUtils.buildSiteConfigs(env, context);

    // Create the combined config array
    let configs = [...moduleConfigs, ...siteConfigs];

    // Ensure all configs are fully resolved (in case any are Promises)
    configs = await Promise.all(
      configs.map(async (config) => {
        return config instanceof Promise ? await config : config;
      })
    );

    log(`Building all ${configs.length} webpack config objects...\n`);

    if (configs.length) {
      // Add server config (synchronous)
      configs[0].devServer = buildUtils.buildServerConfig(argv, context);
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
