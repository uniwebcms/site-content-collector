/**
 * Shared Constants for Webpack Configuration
 *
 * Centralizes common values used across webpack configuration files.
 * This helps maintain consistency and makes updates easier.
 */

// Build Modes
export const BUILD_MODES = {
  PRODUCTION: "production",
  DEVELOPMENT: "development",
};

// File Extensions
export const EXTENSIONS = {
  JAVASCRIPT: [".js", ".jsx"],
  TYPESCRIPT: [".ts", ".tsx"],
  STYLES: [".css", ".scss", ".sass"],
  IMAGES: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  FONTS: [".woff", ".woff2", ".eot", ".ttf", ".otf"],
  DOCUMENTS: [".txt", ".md", ".mdx", ".csl"],
};

// Default Ports and URLs
export const DEFAULTS = {
  DEV_SERVER_PORT: 3005,
  PUBLIC_URL: "http://localhost",
};

// Build Paths
export const PATHS = {
  SRC: "src",
  DIST: "dist",
  BUILD_DEV: "build_dev",
  COMPONENTS: "components",
  NODE_MODULES: "node_modules",
};

// File Names
export const FILES = {
  ENTRY: "index",
  PACKAGE_JSON: "package.json",
  TUNNEL_URL: "quick-tunnel.txt",
  REMOTE_ENTRY: "remoteEntry.js",
  MODULE_CONFIG: "module.yml",
  SITE_CONFIG: "site.yml",
};

// Webpack Specific
export const WEBPACK = {
  // Chunk size limits (in bytes)
  MAX_CHUNK_SIZE: 512000, // 500KB
  MIN_CHUNK_SIZE: 20000, // 20KB
  GZIP_THRESHOLD: 10240, // 10KB

  // Cache settings
  CACHE_DIRECTORY: ".cache/webpack",

  // Module Federation
  MODULE_FEDERATION: {
    DEFAULT_REMOTE_TYPE: "WebsiteRemote",
    SHARED_DEPS: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.4.2",
    },
  },
};

// Error Messages
export const ERRORS = {
  NO_MODULES: "No modules available in source directory",
  INVALID_MODULE: "Module does not exist or is invalid:",
  MISSING_ENTRY: "Module is missing an entry point (index.js or index.jsx):",
  NO_PUBLIC_URL: "No public URL received under production mode",
  MISSING_TUNNEL_URL:
    "Missing tunnel URL. Please ensure tunnel is running and URL file exists",
};

// Npm Lifecycle Events
export const LIFECYCLE_EVENTS = {
  BUILD: "build",
  BUILD_DEV: "build:dev",
  BUILD_PROD: "build:prod",
  BUILD_PROD_COMMIT: "build:prod-commit",
  BUILD_PROD_COPY: "build:prod-copy",
  BUILD_PROD_COPY_COMMIT: "build:prod-copy-commit",
  WATCH_TUNNEL: "watch:tunnel",
  WATCH_LOCAL: "watch:local",
  DEV: "dev",
};

// RegExp Patterns
export const PATTERNS = {
  TAILWIND_CONFIG: /^tailwind(?:\.(.+))?\.config\.js$/,
  VALID_MODULE_NAME: /^[^_\.][^\/\\]*$/,
};

export default {
  BUILD_MODES,
  EXTENSIONS,
  DEFAULTS,
  PATHS,
  FILES,
  WEBPACK,
  ERRORS,
  LIFECYCLE_EVENTS,
  PATTERNS,
};
