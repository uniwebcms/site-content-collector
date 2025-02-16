# @uniwebcms/site-content-collector Implementation Guide

## Project Structure

```
src/
├── core/
│   ├── collector.js       # Main content collection logic
│   ├── plugin.js          # Plugin system base classes
│   └── utils.js           # Shared utilities
├── plugins/
│   ├── data-loader.js     # Input data loading plugin
│   ├── image-meta.js      # Image metadata plugin
│   └── file-ordering.js   # File ordering plugin
├── webpack/
│   └── config.js          # Webpack plugin
├── cli/
│   └── collect.js         # CLI implementation
└── index.js               # Main entry point

bin/
└── collect-content.js     # CLI executable

tests/
├── core/
│   ├── collector.test.js
│   └── plugin.test.js
└── plugins/
    ├── data-loader.test.js
    └── image-meta.test.js
```

## Implementation Steps

1. **Core System**
   - Implement plugin system base classes
   - Create main collector with plugin support
   - Implement utility functions
2. **Built-in Plugins**

   - Data loader plugin for handling input data
   - Image metadata plugin for sidecar files
   - File ordering plugin for flexible section ordering

3. **CLI & Webpack**
   - Update CLI to use ESM
   - Modernize webpack plugin
4. **Testing**
   - Unit tests for core functionality
   - Integration tests for plugins
   - Example site structure for testing

## Configuration

### site.yml Example

```yaml
plugins:
  dataLoader:
    cache: true
    revalidate: 3600
  imageMeta:
    enabled: true
    sidecarExt: ".yml"
  fileOrdering:
    defaultStrategy: "numeric-first"
```

### Markdown Front Matter

```yaml
---
component: Hero
input: "./data.json" # or URL, or advanced config
props:
  background: "./images/hero.jpg"
---
```

## Dependencies

```json
{
  "dependencies": {
    "@uniwebcms/content-reader": "^1.0.1",
    "js-yaml": "^4.1.0",
    "commander": "^11.1.0"
  }
}
```

## CLI

There are two files: the executable script and the CLI implementation.

The CLI implementation provides:

1. Basic commands for collecting content:

   ```bash
   collect-content ./source ./output.json
   collect-content ./source ./output-dir
   ```

2. Options for customization:

   ```bash
   # Pretty print output
   collect-content ./source ./output.json --pretty

   # Verbose logging
   collect-content ./source ./output.json --verbose

   # Require numeric prefixes
   collect-content ./source ./output.json --require-prefix

   # Disable plugins
   collect-content ./source ./output.json --no-data-loader --no-image-meta
   ```

3. Features:
   - Automatically creates output directories
   - Validates file extensions
   - Provides helpful error messages
   - Supports both file and directory output
   - Controls plugin usage
   - Pretty printing option
   - Verbose logging option
