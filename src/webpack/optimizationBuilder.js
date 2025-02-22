/**
 * Optimization Builder for Webpack Configuration
 *
 * Manages build optimization settings including:
 * - Code splitting
 * - Bundle minimization
 * - Cache management
 * - Performance hints
 */

import path from "path";
import TerserPlugin from "terser-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";

import { BUILD_MODES, WEBPACK, PATHS } from "./constants.js";

/**
 * Configure code splitting optimization
 * @param {Object} options Configuration options
 * @returns {Object} Code splitting configuration
 */
function getCodeSplittingConfig({ isProduction }) {
  if (!isProduction) {
    return {
      chunks: "all",
      minSize: WEBPACK.MIN_CHUNK_SIZE,
    };
  }

  return {
    chunks: "all",
    maxInitialRequests: Infinity,
    minSize: WEBPACK.MIN_CHUNK_SIZE,
    cacheGroups: {
      default: false,
      defaultVendors: false,

      // Node modules vendor bundles
      vendor: {
        test: new RegExp(`[\\\\/]${PATHS.NODE_MODULES}[\\\\/]`),
        name(module) {
          // Generate readable chunk names from package names
          const packageName = module.context.match(
            /[\\/]node_modules[\\/](.*?)([\\/]|$)/
          )[1];
          return `vendor.${packageName.replace("@", "")}`;
        },
        chunks: "all",
        enforce: true,
        priority: 20,
      },

      // Common code chunks
      common: {
        name: "common",
        minChunks: 2,
        chunks: "async",
        priority: 10,
        reuseExistingChunk: true,
        enforce: true,
      },
    },
  };
}

/**
 * Configure minimizer plugins
 * @returns {Array} Array of minimizer plugins
 */
function getMinimizerConfig() {
  return [
    new TerserPlugin({
      parallel: true,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ["console.log"],
        },
        format: {
          comments: false,
        },
        mangle: {
          safari10: true,
        },
      },
      extractComments: false,
    }),

    new CssMinimizerPlugin({
      parallel: true,
      minimizerOptions: {
        preset: [
          "default",
          {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            minifyFontValues: { removeQuotes: false },
          },
        ],
      },
    }),
  ];
}

/**
 * Configure cache settings
 * @param {Object} options Cache options
 * @returns {Object} Cache configuration
 */
function getCacheConfig({ rootDir, configPath }) {
  return {
    type: "filesystem",
    version: `${Date.now()}`,
    buildDependencies: {
      config: [configPath],
    },
    cacheDirectory: path.resolve(
      rootDir,
      PATHS.NODE_MODULES,
      WEBPACK.CACHE_DIRECTORY
    ),
    compression: "gzip",
    name: process.env.NODE_ENV,
    store: "pack",
  };
}

/**
 * Configure performance hints
 * @param {Object} options Performance options
 * @returns {Object|boolean} Performance hints configuration
 */
function getPerformanceConfig({ isProduction }) {
  if (!isProduction) return false;

  return {
    hints: "warning",
    maxEntrypointSize: WEBPACK.MAX_CHUNK_SIZE,
    maxAssetSize: WEBPACK.MAX_CHUNK_SIZE,
    assetFilter: (assetFilename) => {
      return !(
        assetFilename.endsWith(".map") || assetFilename.endsWith(".LICENSE.txt")
      );
    },
  };
}

/**
 * Get complete optimization configuration
 * @param {Object} options Configuration options
 * @returns {Object} Complete optimization configuration
 */
function getOptimizationConfig({ isProduction, rootDir, configPath }) {
  if (!isProduction) {
    return {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: getCodeSplittingConfig({ isProduction }),
      runtimeChunk: "single",
    };
  }

  return {
    minimize: true,
    minimizer: getMinimizerConfig(),
    splitChunks: getCodeSplittingConfig({ isProduction }),
    runtimeChunk: "single",
    concatenateModules: true,
    emitOnErrors: false,
    moduleIds: "deterministic",
    chunkIds: "deterministic",
    mangleExports: "deterministic",
    innerGraph: true,
    sideEffects: true,
  };
}

/**
 * Get complete build optimization settings
 * @param {Object} options Configuration options
 * @returns {Object} Complete build optimization settings
 */
export function getBuildOptimizations(options) {
  const isProduction = options.mode === BUILD_MODES.PRODUCTION;

  return {
    optimization: getOptimizationConfig({ ...options, isProduction }),
    cache: getCacheConfig(options),
    performance: getPerformanceConfig({ isProduction }),
  };
}

export default {
  getBuildOptimizations,
  getOptimizationConfig,
  getCacheConfig,
  getPerformanceConfig,
  getCodeSplittingConfig,
  getMinimizerConfig,
};
