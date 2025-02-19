// Collector framework
export { ContentCollector } from "./core/collector.js";

// Helper functions
export { createCollector, collectSiteContent } from "./setup.js";

// Built-in collector plugins
export { DataLoaderPlugin } from "./plugins/data-loader.js";
export { ImageMetadataPlugin } from "./plugins/image-meta.js";

// Plugin framework
export {
  CollectorPlugin,
  ProcessorPlugin, // Modifies ProseMirror document
  LoaderPlugin, // Load data from external sources (ie not md files)
  TransformerPlugin, // Modifies the final output structure
} from "./core/plugin.js";

// Built-in webpack plugins
export { SiteContentPlugin } from "./hostWebpack/site-content-plugin.js";

// Built-in webpack helpers
export { loadSiteConfig } from "./hostWebpack/site-config-loader.js";
