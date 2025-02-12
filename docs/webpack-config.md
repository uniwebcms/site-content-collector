# Webpack Configuration Guide

This guide explains the webpack configuration provided by `@uniwebcms/site-content-collector` and how to customize it for your needs.

## Default Configuration

The package provides a pre-configured webpack 5 setup through the `getConfig` function. This configuration includes:

- Module federation for remote component loading
- Asset handling (fonts, images, CSS)
- React/JSX compilation with Babel
- Site content injection via SiteContentPlugin
- Development server with hot reload
- Production optimizations (code splitting, caching)
- Static file copying from public directory

## Usage Options

### 1. Standard Configuration

The simplest approach is to use the provided configuration in your project's `webpack.config.js`:

```javascript
const { getConfig } = require("@uniwebcms/site-content-collector/webpack");
const webpack = require("webpack");

module.exports = async (_, argv) => getConfig(webpack, argv, __dirname);
```

### 2. Extending the Configuration

To modify the default configuration while keeping its base features:

```javascript
const { getConfig } = require("@uniwebcms/site-content-collector/webpack");
const webpack = require("webpack");

module.exports = async (_, argv) => {
  const config = await getConfig(webpack, argv, __dirname);

  // Add your customizations
  config.plugins.push(/* your plugins */);
  config.module.rules.push(/* your rules */);

  return config;
};
```

### 3. Full Control

For complete control, you can copy the webpack configuration code from `@uniwebcms/site-content-collector/src/webpack/config.js` into your project. When doing this, replace the local imports with:

```javascript
const {
  SiteContentPlugin,
  loadSiteConfig,
} = require("@uniwebcms/site-content-collector/webpack");
```

Then modify the configuration code as needed for your project.

## Configuration Details

### Prerequisites

Your project must have these dependencies:

```json
{
  "devDependencies": {
    "webpack": "^5.0.0",
    "html-webpack-plugin": "^5.0.0",
    "copy-webpack-plugin": "^11.0.0"
  }
}
```

### Required Configuration

The webpack configuration expects a remote module URL in your `site.yml`:

```yaml
components:
  url: https://your-remote-module-domain" # https://REPO-NAME.github.io
  module: remote-module-path # Marketing/Outreach
  version: latest # or specific hash
```

### Development Server Features

The development configuration includes:

- Hot module replacement for React components
- History API fallback for SPA routing
- Configurable port (default: 3000)
- Static file serving from public directory

### Production Features

The production build optimizes your site with:

- Deterministic module IDs for consistent builds
- Runtime chunk splitting for better caching
- Vendor code separation
- Asset optimization (images, fonts, CSS)
- Clean output directory between builds

For bug reports or feature requests, visit our [GitHub repository](https://github.com/uniwebcms/site-content-collector).
