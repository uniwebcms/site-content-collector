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
import { BUILD_MODES, EXTENSIONS, PATHS } from "./constants.js";

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
 * Create CSS loader configuration with optional Tailwind
 * @param {Object} options Loader options
 * @returns {Object} Webpack loader configuration
 */
function createCssLoader({ isProduction, tailwindConfig = null }) {
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
          plugins: ["postcss-preset-env", "autoprefixer"],
        },
      },
    },
  ];

  if (tailwindConfig) {
    loaders.push(getTailwindLoader(tailwindConfig));
  }

  return {
    test: /\.css$/,
    use: loaders,
  };
}

/**
 * Create SASS loader configuration
 * @param {Object} options Loader options
 * @returns {Object} Webpack loader configuration
 */
function createSassLoader({ isProduction }) {
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
            plugins: ["postcss-preset-env", "autoprefixer"],
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
 * Get Tailwind loader configuration
 * @param {string} configPath Path to Tailwind config
 * @returns {Object} Tailwind loader configuration
 */
function getTailwindLoader(configPath) {
  return {
    loader: "tailwind-loader",
    options: { config: configPath },
  };
}

/**
 * Get all loader rules for webpack configuration
 * @param {Object} options Configuration options
 * @returns {Array} Array of webpack loader rules
 */
export function getLoaderRules({ isProduction, tailwindConfig }) {
  return [
    createJavaScriptLoader(),
    createCssLoader({ isProduction, tailwindConfig }),
    createSassLoader({ isProduction }),
    createSvgLoader(),
    createImageLoader(),
    createFontLoader(),
    createMdxLoader(),
    createRawLoader(),
  ];
}

export default {
  getLoaderRules,
  createJavaScriptLoader,
  createCssLoader,
  createSassLoader,
  createSvgLoader,
  createImageLoader,
  createFontLoader,
  createMdxLoader,
  createRawLoader,
  getTailwindLoader,
};
