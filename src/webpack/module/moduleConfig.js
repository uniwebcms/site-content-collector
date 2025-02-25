import pluginBuilder from "./pluginBuilder.js";
import loaderBuilder from "./loaderBuilder.js";
import pathBuilder from "./pathBuilder.js";
import optimizationBuilder from "./optimizationBuilder.js";
import devServerBuilder from "./devServerBuilder.js";
import moduleUtils from "./moduleUtils.js";
import { BUILD_MODES, PATHS, ERRORS } from "../constants.js";

/**
 * Creates a webpack configuration for a single module variant
 * @param {Object} params Build parameters
 * @returns {Object} Webpack configuration
 */
export default function createModuleConfig(moduleInfo, context) {
  const { variant } = moduleInfo;
  const { rootDir, srcDir, isProduction } = context;

  const moduleName = variant
    ? `${moduleInfo.name}-${variant}`
    : moduleInfo.name;

  // Get paths configuration
  const paths = pathBuilder.getPathConfig(moduleInfo, context);

  // Get module information and exposed components
  // const moduleInfo = moduleUtils.getModuleInfo(srcDir, moduleName);
  // const exposes = moduleUtils.getModuleFederationExposes(srcDir, moduleName);

  // Make sure that the `dynamicExports.js` file of the module is up to date
  moduleUtils.refreshDynamicExports(moduleInfo);

  return {
    name: moduleName,
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
      rules: loaderBuilder.getLoaderRules(moduleInfo, context),
    },

    // Plugins
    plugins: pluginBuilder.getPlugins({
      mode,
      moduleName,
      srcDir,
      publicPath: paths.publicPath,
      outputPath: paths.outputPath,
      buildId,
      exposes: moduleInfo.exposes,
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
            port: context.serverPort,
            buildDevDir: context.buildDevDir,
            publicPath: paths.publicPath,
          }),
        }),

    // Build reporting
    stats: isProduction ? "normal" : "minimal",
  };
}
