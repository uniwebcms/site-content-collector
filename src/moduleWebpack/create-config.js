import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ModuleFederationPlugin } from "webpack/lib/container/ModuleFederationPlugin.js";
import HtmlWebpackPlugin from "html-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

// ESM doesn't have __dirname, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Module Discovery and Information
 */
const moduleUtils = {
  // Find all module folders in src directory
  getModuleFolders: () => {
    const srcPath = path.resolve(__dirname, "src");
    return fs.readdirSync(srcPath).filter((file) => {
      const stats = fs.statSync(path.join(srcPath, file));
      const hasPackageJson = fs.existsSync(
        path.join(srcPath, file, "package.json")
      );
      return stats.isDirectory() && hasPackageJson;
    });
  },

  // Get info about a specific module
  getModuleInfo: (moduleName) => {
    const modulePath = path.resolve(__dirname, "src", moduleName);
    const packageJsonPath = path.join(modulePath, "package.json");

    let packageJson = { dependencies: {} };
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageData = fs.readFileSync(packageJsonPath, "utf8");
        packageJson = JSON.parse(packageData);
      }
    } catch (error) {
      console.warn(
        `Warning: Could not parse package.json for module ${moduleName}`,
        error
      );
    }

    // Try to find entry file with extensions .js or .jsx
    let entryPath = path.join(modulePath, "index.js");
    if (!fs.existsSync(entryPath)) {
      const jsxEntry = path.join(modulePath, "index.jsx");
      if (fs.existsSync(jsxEntry)) {
        entryPath = jsxEntry;
      }
    }

    // Try to find template file - fallback to a default if missing
    let templatePath = path.join(modulePath, "index.html");
    if (!fs.existsSync(templatePath)) {
      templatePath = path.resolve(__dirname, "src", "default-template.html");
    }

    return {
      name: moduleName,
      modulePath,
      packageJson,
      outputPath: path.resolve(__dirname, "dist", moduleName),
      entryPath,
      templatePath,
    };
  },

  // Get all module entries
  getAllEntries: (modules) => {
    const entries = {};
    modules.forEach((moduleName) => {
      const { name, entryPath } = moduleUtils.getModuleInfo(moduleName);
      entries[name] = entryPath;
    });
    return entries;
  },

  // Get exposed components for a module
  getExposedComponents: (moduleName, prefix = "") => {
    const { modulePath } = moduleUtils.getModuleInfo(moduleName);
    const componentsPath = path.join(modulePath, "components");
    if (!fs.existsSync(componentsPath)) return {};

    const components = {};
    fs.readdirSync(componentsPath)
      .filter((file) => file.endsWith(".jsx") || file.endsWith(".js"))
      .forEach((file) => {
        const componentName = file.replace(/\.(jsx|js)$/, "");
        const exposePath = prefix
          ? `./${prefix}/${componentName}`
          : `./${componentName}`;
        components[exposePath] = path.join(componentsPath, file);
      });

    return components;
  },
};

/**
 * Configuration Builders
 */
const configBuilders = {
  // Create base configuration shared by all modes
  createBaseConfig: (env = {}) => {
    const isProd = env.production === true;
    const styleLoaders = isProd
      ? [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"]
      : ["style-loader", "css-loader", "postcss-loader"];

    return {
      mode: isProd ? "production" : "development",
      resolve: {
        extensions: [".js", ".jsx", ".json"],
        alias: {
          "@": path.resolve(__dirname, "src"),
        },
      },
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: ["@babel/preset-env", "@babel/preset-react"],
                cacheDirectory: true,
              },
            },
          },
          {
            test: /\.css$/,
            use: styleLoaders,
          },
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: "asset/resource",
            generator: {
              filename: "assets/images/[hash][ext][query]",
            },
          },
          {
            test: /\.(woff|woff2|eot|ttf|otf)$/i,
            type: "asset/resource",
            generator: {
              filename: "assets/fonts/[hash][ext][query]",
            },
          },
        ],
      },
      cache: {
        type: "filesystem",
        buildDependencies: {
          config: [import.meta.url], // rebuild cache when webpack config changes
        },
      },
      ...(isProd && {
        optimization: {
          minimizer: [
            new TerserPlugin({
              parallel: true,
              terserOptions: {
                format: {
                  comments: false,
                },
                compress: {
                  drop_console: true,
                },
              },
              extractComments: false,
            }),
            new CssMinimizerPlugin(),
          ],
        },
      }),
    };
  },

  // Create output configuration
  createOutputConfig: (moduleName, basePort, index, isSingleServer, env) => {
    const port = basePort + (index || 0);

    if (isSingleServer) {
      return {
        path: path.resolve(__dirname, "dist"),
        filename: "[name]/[name].[contenthash].js",
        publicPath: env.production ? "/" : `http://localhost:${basePort}/`,
        clean: true,
      };
    } else {
      const { outputPath } = moduleUtils.getModuleInfo(moduleName);
      return {
        path: outputPath,
        filename: "[name].[contenthash].js",
        publicPath: env.production
          ? `/${moduleName}/`
          : `http://localhost:${port}/`,
        clean: true,
      };
    }
  },

  // Create dev server configuration
  createDevServerConfig: (modules, basePort, index, isSingleServer) => {
    const port = basePort + (index || 0);

    const baseDevServerConfig = {
      hot: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      compress: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        logging: "info",
        progress: true,
      },
      open: env?.open || false,
    };

    if (isSingleServer) {
      // Create history API fallback rewrites for each module
      const historyRewrites = modules.map((moduleName) => ({
        from: new RegExp(`^/${moduleName}/`),
        to: `/${moduleName}/index.html`,
      }));

      return {
        ...baseDevServerConfig,
        static: {
          directory: path.resolve(__dirname, "dist"),
          watch: true,
        },
        port: basePort,
        historyApiFallback: { rewrites: historyRewrites },
        setupExitSignals: true,
        devMiddleware: {
          publicPath: "/",
          stats: "minimal",
        },
      };
    } else {
      const { outputPath } = moduleUtils.getModuleInfo(modules[0]);
      return {
        ...baseDevServerConfig,
        static: {
          directory: outputPath,
          watch: true,
        },
        port,
        historyApiFallback: true,
        setupExitSignals: true,
        devMiddleware: {
          publicPath: "/",
          stats: "minimal",
        },
      };
    }
  },

  // Create plugin configuration
  createPlugins: (modules, basePort, isSingleServer, env) => {
    const isProd = env.production === true;

    // Common plugins for both modes
    const commonPlugins = isProd
      ? [
          new MiniCssExtractPlugin({
            filename: isSingleServer
              ? "[name]/styles.[contenthash].css"
              : "styles.[contenthash].css",
          }),
        ]
      : [];

    if (isSingleServer) {
      // Generate module federation and HTML plugins for all modules
      const allPlugins = [...commonPlugins];

      modules.forEach((moduleName) => {
        // Add federation plugin
        allPlugins.push(
          pluginFactory.createFederationPlugin(
            moduleName,
            isProd ? "/" : `http://localhost:${basePort}/`,
            true
          )
        );

        // Add HTML plugin
        allPlugins.push(pluginFactory.createHtmlPlugin(moduleName, true));
      });

      return allPlugins;
    } else {
      const moduleName = modules[0];
      const index = 0;
      const port = basePort + index;
      const publicPath = isProd
        ? `/${moduleName}/`
        : `http://localhost:${port}/`;

      return [
        ...commonPlugins,
        pluginFactory.createFederationPlugin(moduleName, publicPath),
        pluginFactory.createHtmlPlugin(moduleName),
      ];
    }
  },
};

/**
 * Plugin Factories
 */
const pluginFactory = {
  // Create ModuleFederationPlugin
  createFederationPlugin: (moduleName, publicPath, isSingleServer = false) => {
    const { packageJson } = moduleUtils.getModuleInfo(moduleName);

    return new ModuleFederationPlugin({
      name: moduleName,
      filename: isSingleServer
        ? `${moduleName}/remoteEntry.js`
        : "remoteEntry.js",
      exposes: moduleUtils.getExposedComponents(
        moduleName,
        isSingleServer ? moduleName : ""
      ),
      shared: {
        react: {
          singleton: true,
          requiredVersion: packageJson.dependencies?.react || "*",
        },
        "react-dom": {
          singleton: true,
          requiredVersion: packageJson.dependencies?.["react-dom"] || "*",
        },
      },
    });
  },

  // Create HtmlWebpackPlugin
  createHtmlPlugin: (moduleName, isSingleServer = false) => {
    const { templatePath } = moduleUtils.getModuleInfo(moduleName);

    return new HtmlWebpackPlugin({
      template: templatePath,
      filename: isSingleServer ? `${moduleName}/index.html` : "index.html",
      chunks: isSingleServer ? [moduleName] : undefined,
    });
  },
};

/**
 * Main Configuration Factory
 */
const createWebpackConfig = (modules, isSingleServer, env, basePort = 8080) => {
  const baseConfig = configBuilders.createBaseConfig(env);
  const isProd = env.production === true;

  // Production optimizations
  const productionOptimizations = isProd
    ? {
        optimization: {
          minimize: true,
          splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 20000,
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name(module) {
                  // Get the package name
                  const packageName = module.context.match(
                    /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                  )[1];
                  // Return a nice readable name
                  return `vendor.${packageName.replace("@", "")}`;
                },
              },
            },
          },
          runtimeChunk: "single",
        },
        performance: {
          hints: "warning",
          maxEntrypointSize: 512000,
          maxAssetSize: 512000,
        },
      }
    : {
        optimization: {
          runtimeChunk: false,
        },
      };

  if (isSingleServer) {
    return {
      ...baseConfig,
      entry: moduleUtils.getAllEntries(modules),
      output: configBuilders.createOutputConfig(
        null,
        basePort,
        null,
        true,
        env
      ),
      devServer: configBuilders.createDevServerConfig(
        modules,
        basePort,
        null,
        true,
        env
      ),
      plugins: configBuilders.createPlugins(modules, basePort, true, env),
      ...productionOptimizations,
      stats: isProd ? "normal" : "minimal",
    };
  } else {
    return modules.map((moduleName, index) => {
      const { entryPath } = moduleUtils.getModuleInfo(moduleName);

      return {
        ...baseConfig,
        name: moduleName,
        entry: entryPath,
        output: configBuilders.createOutputConfig(
          moduleName,
          basePort,
          index,
          false,
          env
        ),
        devServer: configBuilders.createDevServerConfig(
          [moduleName],
          basePort,
          index,
          false,
          env
        ),
        plugins: configBuilders.createPlugins(
          [moduleName],
          basePort,
          false,
          env
        ),
        ...productionOptimizations,
        stats: isProd ? "normal" : "minimal",
      };
    });
  }
};

/**
 * Webpack Configuration Entry Point
 */
const webpackConfig = (env = {}) => {
  const modules = env.module ? [env.module] : moduleUtils.getModuleFolders();
  const isSingleServer =
    env.singleServer === "true" || env.singleServer === true;
  const basePort = env.port ? parseInt(env.port) : 8080;

  return createWebpackConfig(modules, isSingleServer, env, basePort);
};

export default webpackConfig;
