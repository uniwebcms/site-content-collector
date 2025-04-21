import path from "path";
import pluginBuilder from "./pluginBuilder.js";
import loaderBuilder from "./loaderBuilder.js";
import moduleUtils from "./moduleUtils.js";
import fileUtils from "../fileUtils.js";
// import { getBuildOptimizations } from "./optimizationBuilder.js";
// import { getDevServerConfig } from "./devServerBuilder.js";

/**
 * Creates a webpack configuration for a single module variant
 * @param {Object} params Build parameters
 * @returns {Object} Webpack configuration
 */
export default async function createModuleConfig(moduleInfo, context) {
  const { variant, buildId: uuid } = moduleInfo;
  const { isProduction, logger } = context;
  const moduleName = moduleInfo.name;

  // Add extra info to the module specs
  moduleInfo.publicUrl = context.basePublicUrl + `${moduleName}/${uuid}/`;

  moduleInfo.outputPath =
    path.join(context.outputDir, moduleName, uuid) +
    (variant ? `_${variant}` : "");

  // Make sure that the `dynamicExports.js` file of the module is up to date
  moduleUtils.refreshDynamicExports(moduleInfo);

  // logger.warn("publicUrl", moduleInfo.publicUrl);
  // logger.warn("moduleInfo", moduleInfo);

  moduleInfo.tailwindConfig = await getTailwindConfig(moduleInfo);

  return {
    name: variant ? `${moduleName}-${variant}` : moduleName,
    mode: moduleInfo.mode,

    // Entry configuration
    entry: moduleInfo.entryPath, // @todo: multiple entries for variants?

    // Output configuration
    output: {
      path: moduleInfo.outputPath, // absolute, with suffix: `${uuid}` or `${uuid}_${kind}`
      publicPath: moduleInfo.publicUrl, // with suffix `/${module}/${uuid}/`
      filename: "[name].[contenthash].js",
      clean: true,
    },

    // Module resolution
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
      mainFiles: ["index"],
      // alias: {
      //   "@": path.join(moduleInfo.modulePath, "components"),
      // },
    },

    // Loaders
    module: {
      rules: loaderBuilder.getLoaderRules(moduleInfo, context),
    },

    // Plugins
    plugins: pluginBuilder.getPlugins(moduleInfo, context),

    // Optimization and performance
    // ...getBuildOptimizations(moduleInfo, context),

    // Development server
    // ...(isProduction ? {} : { devServer: getDevServerConfig(context) }),
    // watch: !isProduction,
    // watchOptions: {
    //   // ignored: /node_modules/,
    //   aggregateTimeout: 300,
    //   poll: false,
    // },

    // Build reporting
    stats: isProduction ? "normal" : "minimal",
  };
}

function getDefaultTailwindConfig(moduleInfo) {
  return {
    // content: ["./src/**/*.{js,jsx}"],
    // content: [`${moduleInfo.modulePath}/components/**/*.{js,jsx,ts,tsx}`],
    content: [`./src/${moduleInfo.name}/components/**/*.{js,jsx,ts,tsx}`],
    theme: {
      extend: {
        spacing: {
          "8xl": "96rem",
          "9xl": "108rem",
        },
        colors: {
          // Add your custom colors here
          // "custom-blue": "#1da1f2",
        },
      },
    },
    plugins: [
      // Add any plugins you need
      // Note: You'll need to import them at the top of the file
    ],
  };
}

async function getTailwindConfig(moduleInfo) {
  const { tailwindConfigName = "tailwind.config.js" } = moduleInfo;

  const twConfigPath = path.join(moduleInfo.modulePath, tailwindConfigName);
  const tailwindConfig = await fileUtils.loadConfig(twConfigPath);
  // console.log({ tailwindConfig });

  // const mainConfig = getDefaultTailwindConfig(moduleInfo);
  // tailwindConfig.content = mainConfig.content;

  return tailwindConfig;
}
