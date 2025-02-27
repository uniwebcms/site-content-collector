/**
 * Plugin Builder for Webpack Configuration
 *
 * Manages the configuration of all webpack plugins including:
 * - Module Federation
 * - Asset optimization
 * - Build management
 * - Development utilities
 */

import path from "path";
// import { ModuleFederationPlugin } from "webpack/lib/container/ModuleFederationPlugin.js";
// import HtmlWebpackPlugin from "html-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CompressionPlugin from "compression-webpack-plugin";
import YamlSchemaPlugin from "./yaml-schema-plugin.js";
import ManifestGeneratorPlugin from "./manifest-generator-plugin.js";
import CleanAndLogPlugin from "./clean-and-log-plugin.js";

import { BUILD_MODES, WEBPACK, FILES, PATHS } from "../constants.js";

/**
 * Create Module Federation plugin configuration
 * @param {Object} options - Plugin options
 * @returns {Object} Configured plugin
 */
function createModuleFederationPlugin(moduleInfo, context) {
  const { exposes, packageJson } = moduleInfo;
  const { ModuleFederationPlugin } = context.webpack.container;

  // context.logger.info(
  //   "PARAMS",
  //   packageJson.dependencies?.react,
  //   WEBPACK.MODULE_FEDERATION.SHARED_DEPS.react
  // );
  context.logger.warn("exposes", exposes, FILES.REMOTE_ENTRY);

  return new ModuleFederationPlugin({
    //name: moduleInfo.name,
    name: "WebsiteRemote",
    filename: FILES.REMOTE_ENTRY,
    exposes,
    shared: {
      react: {
        singleton: true,
        requiredVersion:
          packageJson.dependencies?.react ||
          WEBPACK.MODULE_FEDERATION.SHARED_DEPS.react,
      },
      "react-dom": {
        singleton: true,
        requiredVersion:
          packageJson.dependencies?.["react-dom"] ||
          WEBPACK.MODULE_FEDERATION.SHARED_DEPS["react-dom"],
      },
      "react-router-dom": {
        singleton: true,
        requiredVersion:
          packageJson.dependencies?.["react-router-dom"] ||
          WEBPACK.MODULE_FEDERATION.SHARED_DEPS["react-router-dom"],
      },
    },
  });
}

/**
 * Create plugins used in both production and development
 * @param {Object} options - Plugin options
 * @returns {Array} Array of webpack plugins
 */
function createCommonPlugins(moduleInfo, context) {
  return [
    // Module Federation setup
    createModuleFederationPlugin(moduleInfo, context),

    // // Generate HTML entry point
    // new HtmlWebpackPlugin({
    //   template: path.join(srcDir, moduleInfo.name, "index.html"),
    //   filename: "index.html",
    // }),

    // Generate schema for module configuration
    new YamlSchemaPlugin({
      srcDir: moduleInfo.modulePath,
      output: "schema.json",
    }),

    // Manage builds and logging
    new CleanAndLogPlugin({
      outputPath: path.dirname(moduleInfo.outputPath),
      publicUrl: moduleInfo.publicUrl,
      currentBuildUuid: moduleInfo.buildId,
      keepBuilds: 20,
    }),
  ];
}

/**
 * Create production-specific plugins
 * @param {Object} options - Plugin options
 * @returns {Array} Array of webpack plugins
 */
function createProductionPlugins(moduleInfo) {
  return [
    // Generate manifest for deployment
    new ManifestGeneratorPlugin({
      srcDir: moduleInfo.modulePath,
    }),

    // Extract and optimize CSS
    new MiniCssExtractPlugin({
      filename: "css/[name].[contenthash].css",
    }),

    // Optimize CSS
    new CssMinimizerPlugin({
      minimizerOptions: {
        preset: [
          "default",
          {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
          },
        ],
      },
      parallel: true,
    }),

    // Optimize JavaScript
    new TerserPlugin({
      parallel: true,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        format: {
          comments: false,
        },
      },
      extractComments: false,
    }),
  ];
}

/**
 * Create development-specific plugins
 * @returns {Array} Array of webpack plugins
 */
function createDevelopmentPlugins(context) {
  const plugins = [];

  if (context.compress) {
    plugins.push(
      // Enable gzip compression for testing
      new CompressionPlugin({
        filename: "[path][base].gzip",
        algorithm: "gzip",
        test: /\.(js|css|html|svg)$/,
        threshold: WEBPACK.GZIP_THRESHOLD,
        minRatio: 0.8,
        deleteOriginalAssets: false,
      })
    );
  }

  return plugins;
}

/**
 * Get all plugins for the webpack configuration
 * @param {Object} options - Configuration options
 * @returns {Array} Combined array of all plugins
 */
export function getPlugins(moduleInfo, context) {
  const commonPlugins = createCommonPlugins(moduleInfo, context);

  const modeSpecificPlugins = context.isProduction
    ? createProductionPlugins(moduleInfo)
    : createDevelopmentPlugins(context);

  return [...commonPlugins, ...modeSpecificPlugins, ...context.userPlugins];
}

export default {
  getPlugins,
  // createModuleFederationPlugin,
  // createCommonPlugins,
  // createProductionPlugins,
  // createDevelopmentPlugins,
};
