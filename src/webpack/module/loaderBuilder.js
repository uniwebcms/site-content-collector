/**
 * Loader Builder for Webpack Configuration
 *
 * Centralizes configuration for all webpack loaders including:
 * - JavaScript/React processing
 * - CSS/SASS handling
 * - Asset management
 * - Special file types
 */

import MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as sass from "sass";
import { BUILD_MODES, EXTENSIONS, PATHS } from "../constants.js";
// import { createRequire } from "module";

/**
 * Create JavaScript/React loader configuration
 * @param {Object} options Loader options
 * @returns {Object} Webpack loader configuration
 */
function createJavaScriptLoader() {
  return {
    test: /\.jsx?$/,
    exclude: new RegExp(PATHS.NODE_MODULES),
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          "@babel/preset-env",
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
        cacheDirectory: true,
        cacheCompression: false,
      },
    },
  };
}

/**
 * Create TypeScript/React loader configuration
 * @param {Object} options Loader options
 * @returns {Object} Webpack loader configuration
 */
function createTypeScriptLoader() {
  return {
    test: /\.tsx?$/,
    exclude: new RegExp(PATHS.NODE_MODULES),
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          "@babel/preset-env",
          ["@babel/preset-react", { runtime: "automatic" }],
          "@babel/preset-typescript",
        ],
        cacheDirectory: true,
        cacheCompression: false,
      },
    },
  };
}

/**
 * Create CSS loader configuration with optional Tailwind
 * @param {Object} moduleInfo Module information
 * @param {Object} context Build context
 * @returns {Object} Webpack loader configuration
 */
function createCssLoader(moduleInfo, context) {
  const { isProduction } = context;

  // Base loaders
  const loaders = [
    isProduction ? MiniCssExtractPlugin.loader : "style-loader",
    {
      loader: "css-loader",
      options: {
        importLoaders: 1,
        modules: {
          auto: true,
          localIdentName: isProduction
            ? "[hash:base64]"
            : "[local]_[hash:base64:5]",
        },
      },
    },
    {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          plugins: getPostCSSPlugins(moduleInfo),
        },
      },
    },
  ];

  return {
    test: /\.css$/,
    use: loaders,
  };
}

/**
 * Create SASS loader configuration with optional Tailwind support
 * @param {Object} moduleInfo Module information
 * @param {Object} context Build context
 * @returns {Object} Webpack loader configuration
 */
function createSassLoader(moduleInfo, context) {
  const { isProduction } = context;

  return {
    test: /\.s[ac]ss$/i,
    use: [
      isProduction ? MiniCssExtractPlugin.loader : "style-loader",
      {
        loader: "css-loader",
        options: {
          importLoaders: 2,
          modules: {
            auto: true,
            localIdentName: isProduction
              ? "[hash:base64]"
              : "[local]_[hash:base64:5]",
          },
        },
      },
      {
        loader: "postcss-loader",
        options: {
          postcssOptions: {
            plugins: getPostCSSPlugins(moduleInfo),
          },
        },
      },
      {
        loader: "sass-loader",
        options: {
          implementation: sass,
          sassOptions: {
            outputStyle: isProduction ? "compressed" : "expanded",
          },
        },
      },
    ],
  };
}

/**
 * Create SVG loader configuration
 * @returns {Object} Webpack loader configuration
 */
function createSvgLoader() {
  return {
    test: /\.svg$/,
    use: [
      {
        loader: "@svgr/webpack",
        options: {
          svgoConfig: {
            plugins: [
              {
                name: "removeViewBox",
                active: false,
              },
            ],
          },
        },
      },
    ],
  };
}

/**
 * Create image loader configuration
 * @returns {Object} Webpack loader configuration
 */
function createImageLoader() {
  return {
    test: new RegExp(
      `\\.(${EXTENSIONS.IMAGES.map((ext) => ext.slice(1)).join("|")})$`
    ),
    type: "asset/resource",
    generator: {
      filename: "assets/images/[hash][ext][query]",
    },
  };
}

/**
 * Create font loader configuration
 * @returns {Object} Webpack loader configuration
 */
function createFontLoader() {
  return {
    test: new RegExp(
      `\\.(${EXTENSIONS.FONTS.map((ext) => ext.slice(1)).join("|")})$`
    ),
    type: "asset/resource",
    generator: {
      filename: "assets/fonts/[hash][ext][query]",
    },
  };
}

/**
 * Create MDX loader configuration
 * @returns {Object} Webpack loader configuration
 */
function createMdxLoader() {
  return {
    test: /\.mdx?$/,
    use: ["babel-loader", "@mdx-js/loader"],
  };
}

/**
 * Create raw file loader configuration
 * @returns {Object} Webpack loader configuration
 */
function createRawLoader() {
  return {
    test: /\.(txt|csl)$/i,
    use: "raw-loader",
  };
}

/**
 * Makes an array of PostCSS plugins configured for the module
 *
 * @param {Object} moduleInfo - Module configuration information
 * @param {string} [moduleInfo.tailwindConfig] - Direct path to tailwind config file
 * @param {Array<Object>} [moduleInfo.tailwindConfigs=[]] - Array of tailwind config objects
 * @param {string} moduleInfo.tailwindConfigs[].path - Path to tailwind config file
 * @returns {Array<(string|[string, Object])>} Array of PostCSS plugins - either as string identifiers
 *                                            or [pluginName, pluginConfig] tuples
 */
function getPostCSSPlugins(moduleInfo) {
  // const require = createRequire(import.meta.url);

  // PostCSS plugins can be strings (for plugins with default config)
  // or [pluginName, pluginOptions] tuples
  const plugins = ["postcss-preset-env", "autoprefixer"];
  const { tailwindConfig, tailwindConfigs = [] } = moduleInfo;
  // console.log({ moduleInfo });
  // Determine which tailwind config to use
  const configPath =
    tailwindConfig ||
    (tailwindConfigs.length > 0 ? tailwindConfigs[0].path : null);

  // Include Tailwind CSS plugin when configuration is available
  if (configPath) {
    try {
      // const tailwindConfig = await fileUtils.loadConfig(configPath);
      // plugins.push(["tailwindcss", tailwindConfig]);
      // plugins.push(["tailwindcss", configPath]);
      plugins.push(["tailwindcss", getDefaultTailwindConfig(moduleInfo)]);
    } catch (error) {
      console.warn(
        `Failed to load Tailwind config at ${configPath}:`,
        error.message
      );
      // Could add a fallback here if needed
    }
  }

  // console.log({ plugins });

  return plugins;
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

/**
 * Get all loader rules for webpack configuration
 * @param {Object} moduleInfo Module information
 * @param {Object} context Build context
 * @returns {Array} Array of webpack loader rules
 */
export function getLoaderRules(moduleInfo, context) {
  return [
    // Add this rule before any other rule to support missing `index.js` in imports
    {
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    },
    createJavaScriptLoader(),
    createTypeScriptLoader(),
    createCssLoader(moduleInfo, context),
    createSassLoader(moduleInfo, context),
    createSvgLoader(),
    createImageLoader(),
    createFontLoader(),
    createMdxLoader(),
    createRawLoader(),
  ];
}

export default {
  getLoaderRules,
};
