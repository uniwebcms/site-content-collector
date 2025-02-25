// Node.js built-ins
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

// External packages
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";

// Local imports
import { SiteContentPlugin } from "./site-content-plugin.js";
import { loadSiteConfig } from "./site-config-loader.js";

// Core plugin system
import { CollectorPlugin } from "../../core/plugin.js";

/**
 * Generates a webpack configuration object with predefined settings and plugins.
 *
 * @param {object} siteInfo -
 * @param {object} context -
 * @returns {Object|Array} Webpack configuration object
 */
async function createSiteConfig(siteInfo, context) {
  const { siteConfig } = siteInfo;
  const { rootDir, userPlugins, isProduction, mode } = context;

  // Setup environment
  // const serverPort = parseInt(argv.port) || 3000;
  const devServerUrl = new URL(context.basePublicUrl);

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
              presets: ["@babel/preset-react", "@babel/preset-env"],
            },
          },
        },
        {
          test: /\.jsx?$/,
          include: [resolve(rootDir, "node_modules/@uniwebcms")],
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-react", "@babel/preset-env"],
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
          RemoteModule: `WebsiteRemote@${siteConfig.components.moduleUrl}/remoteEntry.js`,
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
      port: devServerUrl.port,
      host: devServerUrl.hostname,
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

export default createSiteConfig;
