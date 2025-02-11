const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const SiteContentPlugin = require("./plugin"); // also exported
const loadSiteConfig = require("./loader"); // also exported

/**
 * Generates a webpack configuration object with predefined settings and plugins.
 *
 * @param {object} webpack - The webpack instance to use for plugin creation
 * @param {object} argv - Webpack CLI arguments object
 * @param {string} argv.mode - Build mode ('production' or 'development')
 * @param {number} [argv.port] - Dev server port number
 * @param {string} [rootDir=__dirname] - Project root directory path
 * @returns {Promise<object>} Webpack configuration object
 * @throws {Error} If remote module URL is not configured in site.yml
 *
 * @example
 * const config = await getConfig(webpack, {
 *   mode: 'development',
 *   port: 3000
 * });
 */
async function getConfig(webpack, argv, rootDir = __dirname) {
  const isProduction = argv.mode === "production";
  const mode = isProduction ? "production" : "development";
  const serverPort = parseInt(argv.port) || 3000;

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
      path: path.resolve(rootDir, "dist"),
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
            from: path.resolve(rootDir, "public"), // Source folder
            to: path.resolve(rootDir, "dist"), // Destination folder
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
        directory: path.join(rootDir, "dist"),
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

module.exports = { getConfig, loadSiteConfig, SiteContentPlugin };
