// src/index.js
import { ContentCollector } from "./core/collector.js";

// Built-in plugins
import { DataLoaderPlugin } from "./plugins/data-loader.js";
import { ImageMetadataPlugin } from "./plugins/image-meta.js";

// Plugin framework
export {
  CollectorPlugin,
  ProcessorPlugin, // Modifies ProseMirror document
  LoaderPlugin, // Load data from external sources (ie not md files)
  TransformerPlugin, // Modifies the final output structure
} from "./core/plugin.js";

// Export the framework classes in case they are needed
export { ContentCollector, DataLoaderPlugin, ImageMetadataPlugin };

// Create a pre-configured collector with default plugins
export function createCollector(options = {}) {
  const { plugins = [], dataLoader = {}, imageMeta = {}, ...config } = options;

  const collector = new ContentCollector(config);

  // Add built-in plugins if enabled in config (Note: {} evaluates to true)
  if (dataLoader) {
    // Collects JSON data as dynamic into for page sections
    collector.use(new DataLoaderPlugin(dataLoader));
  }

  if (imageMeta) {
    // Collects "sidecar" metadata for images
    collector.use(new ImageMetadataPlugin(imageMeta));
  }

  // Add all other user plugins
  for (const i of plugins) {
    collector.use(plugins[i]);
  }

  return collector;
}

// Convenience function for simple usage
export async function collectSiteContent(rootPath, options = {}) {
  const collector = createCollector(options);
  return collector.collect(rootPath);
}
