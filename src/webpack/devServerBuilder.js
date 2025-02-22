/**
 * Development Server Builder for Webpack Configuration
 *
 * Manages development server settings including:
 * - Hot Module Replacement
 * - Static file serving
 * - Development middleware
 * - Security and CORS settings
 */

import { PATHS, DEFAULTS, BUILD_MODES } from "./constants.js";

/**
 * Configure static file serving
 * @param {Object} options Configuration options
 * @returns {Object} Static serving configuration
 */
function getStaticServing({ buildDevDir }) {
  return {
    static: {
      directory: buildDevDir,
      watch: true,
      staticOptions: {
        ignored: [
          `**/${PATHS.NODE_MODULES}/**`,
          `**/${PATHS.DIST}/**`,
          `**/${PATHS.BUILD_DEV}/**`,
        ],
      },
    },
  };
}

/**
 * Configure dev middleware settings
 * @param {Object} options Configuration options
 * @returns {Object} Dev middleware configuration
 */
function getDevMiddleware({ publicPath }) {
  return {
    devMiddleware: {
      publicPath,
      writeToDisk: true, // For other tools that need physical files
      stats: "minimal",
    },
  };
}

/**
 * Configure hot module replacement
 * @returns {Object} HMR configuration
 */
function getHotModuleConfig() {
  return {
    hot: "only", // Prevents page reload as fallback
    liveReload: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
      reconnect: 5, // Number of reconnection attempts
      logging: "info",
    },
  };
}

/**
 * Configure security headers
 * @returns {Object} Headers configuration
 */
function getHeaders() {
  return {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "X-Requested-With, content-type, Authorization",
    },
  };
}

/**
 * Configure history API fallback for SPA
 * @returns {Object} History API configuration
 */
function getHistoryFallback() {
  return {
    historyApiFallback: {
      disableDotRule: true,
      index: "/index.html",
      rewrites: [
        // Handle routes for multi-page setups
        { from: /^\/[^.]*$/, to: "/index.html" },
      ],
    },
  };
}

/**
 * Configure development server logging
 * @returns {Object} Logging configuration
 */
function getLoggingConfig() {
  return {
    logging: "info",
    logLevel: "info",
    proxy: {
      logLevel: "warn",
    },
  };
}

/**
 * Configure file watching options
 * @returns {Object} Watch options configuration
 */
function getWatchOptions() {
  return {
    watchOptions: {
      ignored: [
        `**/${PATHS.NODE_MODULES}/**`,
        `**/${PATHS.DIST}/**`,
        `**/${PATHS.BUILD_DEV}/**`,
        "**/.git/**",
      ],
      aggregateTimeout: 300,
      poll: false, // Use filesystem events
    },
  };
}

/**
 * Configure development server security
 * @returns {Object} Security configuration
 */
function getSecurityConfig() {
  return {
    server: {
      type: "http",
    },
    allowedHosts: "all", // For development only
    compress: true,
  };
}

/**
 * Configure browser opening behavior
 * @returns {Object} Open configuration
 */
function getOpenConfig() {
  return {
    open: {
      target: ["index.html"],
      app: {
        name: process.platform === "darwin" ? "google chrome" : "chrome",
      },
    },
  };
}

/**
 * Configure web socket server for HMR
 * @returns {Object} WebSocket configuration
 */
function getWebSocketConfig() {
  return {
    webSocketServer: {
      type: "ws",
      options: {
        path: "/ws",
      },
    },
  };
}

/**
 * Get complete development server configuration
 * @param {Object} options Configuration options
 * @returns {Object} Complete dev server configuration
 */
export function getDevServerConfig({
  port = DEFAULTS.DEV_SERVER_PORT,
  buildDevDir,
  publicPath,
}) {
  return {
    port,
    host: "localhost",
    ...getStaticServing({ buildDevDir }),
    ...getDevMiddleware({ publicPath }),
    ...getHotModuleConfig(),
    ...getHeaders(),
    ...getHistoryFallback(),
    ...getLoggingConfig(),
    ...getWatchOptions(),
    ...getSecurityConfig(),
    ...getOpenConfig(),
    ...getWebSocketConfig(),

    // Enable proper process signal handling
    setupExitSignals: true,

    // Enable graceful shutdown
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error("webpack-dev-server is not defined");
      }

      // Handle shutdown gracefully
      process.on("SIGTERM", () => {
        console.log("Received SIGTERM, shutting down dev server...");
        devServer.close(() => {
          process.exit(0);
        });
      });

      return middlewares;
    },
  };
}

export default {
  getDevServerConfig,
  getStaticServing,
  getDevMiddleware,
  getHotModuleConfig,
  getHeaders,
  getHistoryFallback,
  getLoggingConfig,
  getWatchOptions,
  getSecurityConfig,
  getOpenConfig,
  getWebSocketConfig,
};
