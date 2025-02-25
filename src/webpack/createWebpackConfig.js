/**
 * Main Webpack Configuration Generator
 *
 * Composes all webpack configuration components into a complete build configuration.
 * Handles multiple build modes, environments, and module variants.
 */

import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

import moduleUtils from "./module/moduleUtils.js";
import siteUtils from "./site/siteUtils.js";
import createModuleConfig from "./module/moduleConfig.js";
import createSiteConfig from "./site/siteConfig.js";
import { PATHS, BUILD_MODES } from "./constants.js";
import { readConfigFile, normalizeUrl } from "./fileUtils.js";

/**
 * Creates a webpack configuration for a module
 * @param {Object} moduleInfo Module info
 * @param {Object} context Build context
 * @returns {Object|Array} Webpack configuration(s)
 */
function buildModuleVariantConfig(moduleInfo, context) {
  // Generate unique build identifier for each module
  const buildId = uuidv4();

  // Create configurations for each Tailwind variant (or single config if no variants)
  if (moduleInfo.tailwindConfigs.length <= 1)
    return createModuleConfig({ ...moduleInfo, buildId }, context);

  return moduleInfo.tailwindConfigs.map(({ path, kind }) =>
    createModuleConfig({
      moduleInfo: {
        ...moduleInfo,
        buildId,
        variant,
        tailwindConfig: path,
        variant: kind,
      },
      context,
    })
  );
}

function buildModuleConfigs(context) {
  const targetModule =
    context.env.TARGET_MODULES || context.env.TARGET_MODULE || "*";

  // Determine which modules to build
  const modules = moduleUtils.getModulesToBuild(targetModule, context.rootDir);

  // Build configurations for modules
  return modules.flatMap((moduleInfo) =>
    buildModuleVariantConfig(moduleInfo, context)
  );
}

async function buildSiteConfigs(context) {
  const targetSite = context.env.TARGET_SITES || context.env.TARGET_SITE || "*";

  // Determine which sites to build
  const sites = siteUtils.getSitesToBuild(targetSite, context.rootDir);

  // Build configurations for sites
  return sites.flatMap((siteInfo) => createSiteConfig(siteInfo, context));
}

function chooseBuildMode() {
  const isMainBranch = process.env.CF_PAGES_BRANCH === "main";

  return isMainBranch ? BUILD_MODES.PRODUCTION : BUILD_MODES.DEVELOPMENT;
}

function getProdBaseUrl(rootDir, argv, env) {
  let { PUBLIC_URL, CF_PAGES_URL, CF_PAGES_BRANCH, GH_PAGES_URL } = env;

  PUBLIC_URL ??= getDevBaseUrl(rootDir, argv, env);
  PUBLIC_URL = normalizeUrl(PUBLIC_URL);
  CF_PAGES_URL = normalizeUrl(CF_PAGES_URL);
  GH_PAGES_URL = normalizeUrl(GH_PAGES_URL);

  if (CF_PAGES_BRANCH !== "main" && CF_PAGES_BRANCH !== "master")
    CF_PAGES_URL = null;

  return CF_PAGES_URL || GH_PAGES_URL || PUBLIC_URL;
}

function getDevBaseUrl(rootDir, argv, env) {
  let { TUNNEL_URL, DEV_SERVER_PORT } = env;

  const port = parseInt(argv.port) || DEV_SERVER_PORT || 3005;
  const isTunnel = !!argv.tunnel;

  if (!isTunnel) return `http://localhost:${port}`;

  TUNNEL_URL ??= readConfigFile(
    path.join(rootDir, PATHS.BUILD_DEV, "quick-tunnel.txt")
  );

  return normalizeUrl(TUNNEL_URL);
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
 * import { configHost } from "@uniwebcms/site-content-collector/webpack";
 * import webpack from "webpack";
 * import { ImageOptimizerPlugin } from './plugins/image-optimizer';
 * import { CustomWebpackPlugin } from './plugins/webpack-plugin';
 *
 * const plugins = [
 *   new ImageOptimizerPlugin({ quality: 80 }),  // CollectorPlugin for image processing
 *   new CustomWebpackPlugin()                   // Standard webpack plugin
 * ];
 *
 * export default async (_, argv) => configHost(webpack, argv, import.meta.url, plugins);
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

  // const port = parseInt(argv.port) || process.env.DEV_SERVER_PORT || 3000;
  const mode = argv.mode || chooseBuildMode();
  const isProduction = mode === BUILD_MODES.PRODUCTION;
  const relOutDir = isProduction ? PATHS.DIST : PATHS.BUILD_DEV;
  const outputDir = path.join(rootDir, relOutDir);
  const env = process.env;

  // Prepare the base public URL such that the module's URL is `${basePublicUrl}/${moduleName}/${uuid}/`
  const basePublicUrl = isProduction
    ? getProdBaseUrl(rootDir, argv, env)
    : getDevBaseUrl(rootDir, argv, env);

  // Setup build context
  const context = {
    webpack,
    // env: process.env,
    // argv,
    mode,
    isProduction,
    // port,
    rootDir,
    outputDir,
    // relOutDir,
    // srcDir: path.resolve(rootDir, PATHS.SRC),
    // distDir: path.resolve(rootDir, PATHS.DIST),
    buildDevDir: path.resolve(rootDir, PATHS.BUILD_DEV),
    userPlugins,
    basePublicUrl,
    // lifecycleEvent: process.env.npm_lifecycle_event,
  };

  try {
    const moduleConfigs = buildModuleConfigs(context);
    const siteConfigs = await buildSiteConfigs(context);

    // Concat module and site configs
    const configs = [...moduleConfigs, ...siteConfigs];

    // Return single config or array based on number of configs
    return configs.length === 1 ? configs[0] : configs;
  } catch (error) {
    console.error("Build configuration error:", error);
    throw error;
  }
}
