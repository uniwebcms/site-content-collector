import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";
import { SiteContentPlugin } from "./plugin.js"; // Note the .js extension
import { loadSiteConfig } from "./loader.js"; // Note the .js extension
/**
 * Generates a webpack configuration object with predefined settings and plugins.
 *
 * @param {object} webpack - The webpack instance to use for plugin creation
 * @param {object} argv - Webpack CLI arguments object
 * @param {string} argv.mode - Build mode ('production' or 'development')
 * @param {number} [argv.port] - Dev server port number
 * @param {string} importMetaUrl  - The import.meta.url of the webpack config file
 * @returns {Promise<object>} Webpack configuration object
 * @throws {Error} If remote module URL is not configured in site.yml
 *
 * @example
 * // webpack.config.js
 * import { getConfig } from "@uniwebcms/site-content-collector/webpack";
 * import webpack from "webpack";
 *
 * export default async (_, argv) => getConfig(webpack, argv, import.meta.url);
 */
async function getConfig(webpack, argv, importMetaUrl) {
  const rootDir = dirname(fileURLToPath(importMetaUrl));
  const isProduction = argv.mode === "production";
  const mode = isProduction ? "production" : "development";
  const serverPort = parseInt(argv.port) || 3005;

  if (!rootDir) {
    throw new Error("Invalid root directory");
  }

  const config = await loadSiteConfig(rootDir);
  console.log("Remote module URL:", config.components.moduleUrl);

  if (!config.components.moduleUrl) {
    throw new Error(
      "A remote module URL is required. Please provide it in site.yml"
    );
  }

  const { ModuleFederationPlugin } = webpack.container;

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
      new HtmlWebpackPlugin({
        template: "./public/index.html",
      }),
      new SiteContentPlugin({
        sourcePath: "./pages", // Required: path to content directory
        injectToHtml: true, // Optional: inject into HTML (requires html-webpack-plugin)
        variableName: "__SITE_CONTENT__", // Optional: global variable name when injecting
        filename: "site-content.json", // Optional: output filename when not injecting
      }),
      new CopyPlugin({
        patterns: [
          {
            from: resolve(rootDir, "public"), // Source folder
            to: resolve(rootDir, "dist"), // Destination folder
            globOptions: {
              ignore: ["**/index.html"], // ✅ Ignore index.html
            },
          },
        ],
      }),
      new ModuleFederationPlugin({
        name: "site-builder",
        remotes: {
          RemoteModule: `WebsiteRemote@${config.components.moduleUrl}/remoteEntry.js`,
        },
        shared: {
          react: { singleton: true, requiredVersion: "^18.2.0" },
          "react-dom": {
            singleton: true,
            requiredVersion: "^18.2.0",
          },
          "react-router-dom": {
            singleton: true,
            requiredVersion: "^6.4.2",
          },
        },
      }),
    ],
    devServer: {
      historyApiFallback: true,
      static: {
        directory: join(rootDir, "dist"),
      },
      port: serverPort,
      // proxy: [
      //     {
      //         context: ['/content.json', '/assets'],
      //         target: 'http://localhost:3000'
      //     }
      // ]
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

// module.exports = { getConfig, loadSiteConfig, SiteContentPlugin };
export { getConfig, loadSiteConfig, SiteContentPlugin };
