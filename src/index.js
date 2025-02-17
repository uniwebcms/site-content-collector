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
export function createCollector(config = {}) {
  const collector = new ContentCollector(config);

  // Add built-in plugins if enabled in config
  if (config.plugins?.dataLoader !== false) {
    // Collects JSON data as dynamic into for page sections
    collector.use(new DataLoaderPlugin(config.plugins?.dataLoader));
  }

  if (config.plugins?.imageMeta !== false) {
    // Collects "sidecar" metadata for images
    collector.use(new ImageMetadataPlugin(config.plugins?.imageMeta));
  }

  return collector;
}

// Convenience function for simple usage
export async function collectSiteContent(rootPath, config = {}) {
  const collector = createCollector(config);
  return collector.collect(rootPath);
}
