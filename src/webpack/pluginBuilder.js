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

import { BUILD_MODES, WEBPACK, FILES, PATHS } from "./constants.js";

/**
 * Create Module Federation plugin configuration
 * @param {Object} options - Plugin options
 * @returns {Object} Configured plugin
 */
function createModuleFederationPlugin({
  moduleName,
  exposes,
  packageJson = {},
}) {
  const { ModuleFederationPlugin } = webpack.container;

  return new ModuleFederationPlugin({
    name: moduleName,
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
function createCommonPlugins({
  moduleName,
  srcDir,
  publicPath,
  outputPath,
  buildId,
  exposes,
  packageJson,
}) {
  return [
    // Module Federation setup
    createModuleFederationPlugin({ moduleName, exposes, packageJson }),

    // // Generate HTML entry point
    // new HtmlWebpackPlugin({
    //   template: path.join(srcDir, moduleName, "index.html"),
    //   filename: "index.html",
    // }),

    // Generate schema for module configuration
    new YamlSchemaPlugin({
      srcDir: path.join(PATHS.SRC, moduleName),
      output: "schema.json",
    }),

    // Manage builds and logging
    new CleanAndLogPlugin({
      outputPath,
      publicPath,
      currentBuildUuid: buildId,
      keepBuilds: 2,
    }),
  ];
}

/**
 * Create production-specific plugins
 * @param {Object} options - Plugin options
 * @returns {Array} Array of webpack plugins
 */
function createProductionPlugins({ moduleName }) {
  return [
    // Generate manifest for deployment
    new ManifestGeneratorPlugin({
      srcDir: path.join(PATHS.SRC, moduleName),
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
function createDevelopmentPlugins() {
  return [
    // Enable gzip compression for testing
    new CompressionPlugin({
      filename: "[path][base].gzip",
      algorithm: "gzip",
      test: /\.(js|css|html|svg)$/,
      threshold: WEBPACK.GZIP_THRESHOLD,
      minRatio: 0.8,
      deleteOriginalAssets: false,
    }),
  ];
}

/**
 * Get all plugins for the webpack configuration
 * @param {Object} options - Configuration options
 * @returns {Array} Combined array of all plugins
 */
export function getPlugins({
  mode,
  moduleName,
  srcDir,
  publicPath,
  outputPath,
  buildId,
  exposes,
  packageJson,
  userPlugins = [],
}) {
  const commonPlugins = createCommonPlugins({
    moduleName,
    srcDir,
    publicPath,
    outputPath,
    buildId,
    exposes,
    packageJson,
  });

  const modeSpecificPlugins =
    mode === BUILD_MODES.PRODUCTION
      ? createProductionPlugins({ moduleName })
      : createDevelopmentPlugins();

  return [...commonPlugins, ...modeSpecificPlugins, ...userPlugins];
}

export default {
  getPlugins,
  createModuleFederationPlugin,
  createCommonPlugins,
  createProductionPlugins,
  createDevelopmentPlugins,
};
