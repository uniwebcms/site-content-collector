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
  const version = moduleInfo.packageJson.version;

  // Generate unique build identifier for each module
  const buildId = version; //uuidv4();

  // Clone the module info because it will be extended as it's processed
  // Create configurations for each Tailwind variant (or single config if no variants)
  if (moduleInfo.tailwindConfigs.length <= 1) {
    const tailwindConfigName = moduleInfo.tailwindConfigs[0]?.path;
    return createModuleConfig(
      { ...moduleInfo, buildId, tailwindConfigName },
      context
    );
  }

  return moduleInfo.tailwindConfigs.map(({ path, kind }) =>
    createModuleConfig({
      moduleInfo: {
        ...moduleInfo,
        buildId,
        variant,
        tailwindConfigName: path,
        variant: kind,
      },
      context,
    })
  );
}

function buildModuleConfigs(context) {
  // const targetModule = env.TARGET_MODULE ?? env.TARGET_MODULES ?? "*";

  // Determine which modules to build
  const modules = moduleUtils.getModulesToBuild(context);

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
async function buildSiteConfigs(context) {
  // Determine which sites to build (now awaiting the async function)
  const sites = await siteUtils.getSitesToBuild(context);

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
