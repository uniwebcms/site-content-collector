import { v4 as uuidv4 } from "uuid";
import moduleUtils from "./module/moduleUtils.js";
import siteUtils from "./site/siteUtils.js";
import createModuleConfig from "./module/moduleConfig.js";
import createSiteConfig from "./site/siteConfig.js";

/**
 * Creates a webpack configuration for a module
 * @param {Object} moduleInfo Module info
 * @param {Object} context Build context
 * @returns {Object|Array} Webpack configuration(s)
 */
function buildModuleVariantConfig(moduleInfo, context) {
  // Generate unique build identifier for each module
  const buildId = uuidv4();

  // Clone the module info because it will be extended as it's processed
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

function buildModuleConfigs(env, context) {
  const targetModule = env.TARGET_MODULES || env.TARGET_MODULE || "*";

  // Determine which modules to build
  const modules = moduleUtils.getModulesToBuild(targetModule, context.rootDir);

  // Build configurations for modules
  return modules.flatMap((moduleInfo) =>
    buildModuleVariantConfig(moduleInfo, context)
  );
}

/**
 * Builds configuration for sites based on environment and context
 * @param {Object} env - Environment variables
 * @param {Object} context - Build context
 * @returns {Promise<Array>} - Array of site configurations
 */
async function buildSiteConfigs(env, context) {
  const targetSite = env.TARGET_SITES || env.TARGET_SITE || "*";

  // Determine which sites to build (now awaiting the async function)
  const sites = await siteUtils.getSitesToBuild(targetSite, context);

  // Build configurations for sites
  return sites.flatMap((siteInfo) => createSiteConfig(siteInfo, context));
}

function buildServerConfig(argv, context) {
  return {
    static: {
      directory: context.outputDir,
      watch: true,
    },
    compress: context.isTunnel, // Enable gzip compression for all served files
    port: parseInt(argv.port) || 3000,
    host: "localhost",
    hot: true,
    historyApiFallback: true,
    // Set headers for CORS and module federation
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    devMiddleware: {
      writeToDisk: true,
    },
  };
}

export default { buildServerConfig, buildSiteConfigs, buildModuleConfigs };
