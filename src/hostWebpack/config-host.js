// Node.js built-ins
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

// External packages
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";

// Local imports
import { SiteContentPlugin } from "./site-content-plugin.js";
import { CollectorPlugin } from "../core/plugin.js";
import { loadSiteConfig } from "./site-config-loader.js";

/**
 * Generates a webpack configuration object with predefined settings and plugins.
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
async function configHost(webpack, argv, importMetaUrl, userPlugins = []) {
  // Validate inputs
  if (!Array.isArray(userPlugins)) {
    throw new Error("userPlugins must be an array");
  }

  const rootDir = dirname(fileURLToPath(importMetaUrl));
  if (!rootDir) {
    throw new Error("Invalid root directory");
  }

  // Load and validate site configuration
  const config = await loadSiteConfig(rootDir);
  if (!config.components?.moduleUrl) {
    throw new Error(
      "Remote module URL is required in site.yml (components.moduleUrl)"
    );
  }

  // Setup environment
  const isProduction = argv.mode === "production";
  const mode = isProduction ? "production" : "development";
  const serverPort = parseInt(argv.port) || 3000;

  // Extract webpack plugins
  const { ModuleFederationPlugin } = webpack.container;

  // Partition user plugins by type
  const [collectorPlugins, webpackPlugins] = [
    userPlugins.filter((p) => p instanceof CollectorPlugin),
    userPlugins.filter((p) => !(p instanceof CollectorPlugin)),
  ];

  // Log plugin distribution for debugging
  if (collectorPlugins.length || webpackPlugins.length) {
    console.log(
      `Found ${collectorPlugins.length} collector plugins and ${webpackPlugins.length} webpack plugins`
    );
  }

  return {
    mode,
    entry: "./src/index.js",
    output: {
      path: resolve(rootDir, "dist"),
      filename: "[name].[contenthash].js",
      publicPath: "auto",
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-react"],
            },
          },
        },
        {
          test: /\.(woff2?|ttf|eot)$/,
          type: "asset/resource",
          generator: {
            filename: "fonts/[name].[hash][ext]",
          },
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024, // 8kb
            },
          },
          generator: {
            filename: "images/[name].[hash][ext]",
          },
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.csl$/,
          type: "asset/source",
        },
      ],
    },
    plugins: [
      // Generate HTML file and inject bundles
      new HtmlWebpackPlugin({
        template: "./public/index.html",
      }),

      // Process and inject site content
      new SiteContentPlugin({
        injectToHtml: true, // Optional: inject into HTML (requires html-webpack-plugin)
        variableName: "__SITE_CONTENT__", // Optional: global variable name when injecting
        filename: "site-content.json", // Optional: output filename when not injecting
        plugins: collectorPlugins,
      }),

      // Copy static assets
      new CopyPlugin({
        patterns: [
          {
            from: resolve(rootDir, "public"),
            to: resolve(rootDir, "dist"),
            globOptions: {
              ignore: ["**/index.html"],
            },
          },
        ],
      }),

      // Configure module federation for remote component loading
      new ModuleFederationPlugin({
        name: "site-builder",
        remotes: {
          RemoteModule: `WebsiteRemote@${config.components.moduleUrl}/remoteEntry.js`,
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: "^18.2.0",
            // strictVersion: true,
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^18.2.0",
            // strictVersion: true,
          },
          "react-router-dom": {
            singleton: true,
            requiredVersion: "^6.4.2",
            // strictVersion: true,
          },
        },
      }),

      // Add user-provided webpack plugins
      // ...webpackPlugins,
    ],
    devServer: {
      historyApiFallback: true,
      static: {
        directory: join(rootDir, "dist"),
      },
      port: serverPort,
    },
    optimization: {
      moduleIds: "deterministic",
      runtimeChunk: "single",
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
  };
}

export default configHost;
