import configModule from "./moduleWebpack/config-module.js";
import configHost from "./hostWebpack/config-host.js";
import createConfig from "./webpack/createWebpackConfig.js";

export default createConfig;

// Named generator functions
export { createConfig, configModule, configHost };
