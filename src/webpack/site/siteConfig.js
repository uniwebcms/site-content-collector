import { resolve, join, relative } from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";
import { SiteContentPlugin } from "./site-content-plugin.js";
import { CollectorPlugin } from "../../core/plugin.js";
// import VirtualEntryPlugin from "./virtual-entry-plugin.js";

/**
 * Generates a webpack configuration object with predefined settings and plugins.
 *
 * @param {object} siteInfo -
 * @param {object} context -
 * @returns {Object|Array} Webpack configuration object
 */
async function createSiteConfig(siteInfo, context) {
  const { siteName, sitePath, siteConfig } = siteInfo;
  const { rootDir, userPlugins, isProduction, mode } = context;

  const relSitePath = relative(rootDir, sitePath);
  const relOutPath = siteName ? `sites/${siteName}` : "";

  // Add extra info to the module specs
  siteInfo.publicUrl = context.basePublicUrl + `${relOutPath}/`;
  siteInfo.outputPath = join(context.outputDir, relOutPath);

  // Extract webpack plugins
  const { ModuleFederationPlugin } = context.webpack.container;

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

  const entryPath = "./" + join(relSitePath, "engine/index.js");

  // const entryPath = "./" + join(relSitePath, "engine/virtual-entry.js");
  // const entryCode = `import("./bootstrap.js");`;

  return {
    mode,
    entry: entryPath,
    output: {
      path: siteInfo.outputPath, // absolute, with suffix: `${uuid}` or `${uuid}_${kind}`
      publicPath: siteInfo.publicUrl, // with suffix `/${module}/${uuid}/`

      // path: resolve(rootDir, "dist"),
      filename: "[name].[contenthash].js",
      // publicPath: "auto",
      clean: true,
    },
    module: {
      rules: [
        // {
        //   test: /\.jsx?$/,
        //   exclude: /node_modules/,
        //   use: {
        //     loader: "babel-loader",
        //     options: {
        //       presets: ["@babel/preset-react", "@babel/preset-env"],
        //     },
        //   },
        // },
        // // Process the Uniweb RTE code within the nodes modules
        // {
        //   test: /\.jsx?$/,
        //   include: [
        //     // Regular case for the node_modules folder
        //     resolve(rootDir, "node_modules/@uniwebcms"),
        //     // Yarn PnP virtual path
        //     resolve(
        //       rootDir,
        //       ".yarn/__virtual__/@uniwebcms-uniweb-rte-virtual-"
        //     ),
        //   ],
        //   use: {
        //     loader: "babel-loader",
        //     options: {
        //       presets: ["@babel/preset-react", "@babel/preset-env"],
        //     },
        //   },
        // },
        {
          test: /\.jsx?$/,
          exclude: (modulePath) => {
            // Don't exclude paths containing @uniwebcms
            if (modulePath.includes("@uniwebcms/uniweb-rte")) {
              return false;
            }
            // Exclude all other node_modules
            return /node_modules/.test(modulePath);
          },
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
      // new VirtualEntryPlugin(entryPath, entryCode),
      // Generate HTML file and inject bundles
      new HtmlWebpackPlugin({
        template: "./" + join(relSitePath, "public/index.html"), //"./public/index.html",
      }),

      // Process and inject site content
      new SiteContentPlugin({
        sitePath,
        injectToHtml: true, // Optional: inject into HTML (requires html-webpack-plugin)
        variableName: "__SITE_CONTENT__", // Optional: global variable name when injecting
        filename: "site-content.json", // Optional: output filename when not injecting
        plugins: collectorPlugins,
      }),

      // Copy static assets
      new CopyPlugin({
        patterns: [
          {
            from: resolve(sitePath, "public"),
            to: siteInfo.outputPath,
            globOptions: {
              ignore: ["**/index.html"],
            },
          },
        ],
      }),

      new context.webpack.DefinePlugin({
        // APP_VERSION: JSON.stringify(siteInfo.packageJson.version),
        SITE_BASENAME: JSON.stringify(relSitePath),
      }),

      // Configure module federation for remote component loading
      new ModuleFederationPlugin({
        name: "site-builder",
        remotes: {
          RemoteModule: `WebsiteRemote@${siteConfig.moduleUrl}/remoteEntry.js`,
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
    // devServer: {
    //   historyApiFallback: true,
    //   static: {
    //     directory: join(rootDir, "dist"),
    //   },
    //   port: devServerUrl.port,
    //   host: devServerUrl.hostname,
    // },
    // watch: !isProduction,
    // watchOptions: {
    //   // ignored: /node_modules/,
    //   aggregateTimeout: 300,
    //   poll: false,
    // },

    // Does not work with localhost remotes
    // optimization: {
    //   moduleIds: "deterministic",
    //   runtimeChunk: "single",
    //   splitChunks: {
    //     cacheGroups: {
    //       vendor: {
    //         test: /[\\/]node_modules[\\/]/,
    //         name: "vendors",
    //         chunks: "all",
    //       },
    //     },
    //   },
    // },
  };
}

export default createSiteConfig;
