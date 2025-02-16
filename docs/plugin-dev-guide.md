# Plugin Development Guide

## @uniwebcms/site-content-collector

This guide explains how to create, test, and use plugins for the site content collector library. Plugins allow you to extend and customize how content is processed, enabling features like custom data loading, content transformation, and output modification.

## Overview

### Plugin Types

The library supports three types of plugins, each serving a different purpose:

1. **Processor Plugins**

   - Transform content after it's been read
   - Modify ProseMirror document structure
   - Example: Transform text, process images, add metadata

2. **Loader Plugins**

   - Load data from external sources
   - Handle different data formats
   - Example: Load JSON, fetch API data, read databases

3. **Transformer Plugins**
   - Modify the final output structure
   - Add or remove fields
   - Example: Add SEO data, filter content, reorganize structure

## Creating a Plugin

### Basic Structure

Every plugin extends one of the base plugin classes and implements specific methods:

```javascript
import { ProcessorPlugin } from "@uniwebcms/site-content-collector";

export class MyPlugin extends ProcessorPlugin {
  constructor(options = {}) {
    super(options);
    this.options = {
      defaultOption: true,
      ...options,
    };
  }

  // Available for all plugin types
  async beforeCollect(context) {}
  async afterCollect(context) {}
}
```

### Plugin Methods

#### Processor Plugin

```javascript
class MyProcessor extends ProcessorPlugin {
  async processContent(content, context) {
    // content: ProseMirror document object
    // Return: modified content
    return content;
  }
}
```

#### Loader Plugin

```javascript
class MyLoader extends LoaderPlugin {
  async loadData(source, context) {
    // source: string | object (URL, path, or config)
    // Return: loaded data
    return data;
  }
}
```

#### Transformer Plugin

```javascript
class MyTransformer extends TransformerPlugin {
  async transform(data, context) {
    // data: final output object
    // Return: modified output
    return data;
  }
}
```

### Context Object

Plugins receive a context object with the following properties:

```javascript
{
  config: {},           // Site configuration from site.yml
  environment: string,  // 'development' or 'production'
  currentFile: string, // Path of current file being processed
  errors: Array,       // Collection of error objects
  resourcePath: string, // Root path of site content
  cache: Map           // Shared cache between plugins
}
```

### Error Handling

The library provides built-in error handling that you should use in your plugins:

```javascript
class MyPlugin extends ProcessorPlugin {
  async processContent(content, context) {
    try {
      // Your logic here
      if (someError) {
        throw new Error("Specific error message");
      }
    } catch (err) {
      this.addError(context, err);
      return content; // Return original on error
    }
  }
}
```

## Implementation Examples

### Content Processor Example

```javascript
import { ProcessorPlugin } from "@uniwebcms/site-content-collector";

export class HeadingProcessor extends ProcessorPlugin {
  async processContent(content, context) {
    if (!content?.type === "doc") return content;

    return this.#processNode(content);
  }

  #processNode(node) {
    // Add IDs to heading nodes
    if (node.type === "heading") {
      node.attrs = node.attrs || {};
      node.attrs.id = this.#generateId(node);
    }

    // Process child nodes
    if (node.content) {
      node.content = node.content.map((child) => this.#processNode(child));
    }

    return node;
  }

  #generateId(node) {
    // Generate heading ID from content
    const text = node.content?.map((n) => n.text).join(" ");
    return text
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
  }
}
```

### Data Loader Example

```javascript
import { LoaderPlugin } from "@uniwebcms/site-content-collector";

export class APILoader extends LoaderPlugin {
  constructor(options = {}) {
    super(options);
    this.options = {
      cacheTimeout: 3600,
      ...options,
    };
  }

  async loadData(source, context) {
    if (typeof source !== "string") return null;

    try {
      const cacheKey = `api:${source}`;

      // Check cache first
      if (context.cache.has(cacheKey)) {
        return context.cache.get(cacheKey);
      }

      // Fetch with timeout
      const data = await this.fetchWithTimeout(source);

      // Cache the result
      context.cache.set(cacheKey, data, this.options.cacheTimeout * 1000);

      return data;
    } catch (err) {
      this.addError(context, `Failed to load API data: ${err.message}`);
      return null;
    }
  }
}
```

## Using Plugins

### Installation Methods

1. **NPM Package**

   ```bash
   npm install site-collector-myplugin
   ```

2. **Local Plugin**
   ```javascript
   // plugins/my-plugin.js
   export class MyPlugin extends ProcessorPlugin {...}
   ```

### Usage in Code

```javascript
import { createCollector } from "@uniwebcms/site-content-collector";
import { MyPlugin } from "site-collector-myplugin";

// Method 1: Using createCollector
const collector = createCollector({
  plugins: {
    myPlugin: {
      option1: "value1",
    },
  },
});

// Method 2: Manual plugin registration
collector.use(new MyPlugin({ option1: "value1" }));

// Method 3: Plugin with dependencies
collector.use(new BasePlugin()).use(new DependentPlugin(), ["BasePlugin"]);
```

### Configuration

Plugins can be configured in `site.yml`:

```yaml
plugins:
  myPlugin:
    enabled: true
    option1: value1
    option2: value2
```

## Best Practices

### Performance

- Cache expensive operations
- Process only necessary content
- Use async operations efficiently
- Clean up resources in afterCollect

### Error Handling

- Always use addError for error reporting
- Provide detailed error messages
- Return gracefully from errors
- Clean up after errors

### Configuration

- Provide sensible defaults
- Validate options in constructor
- Document all configuration options
- Use type checking for options

### Testing

```javascript
import { jest } from "@jest/globals";
import { MyPlugin } from "./my-plugin.js";

describe("MyPlugin", () => {
  test("processes content correctly", async () => {
    const plugin = new MyPlugin();
    const content = {
      type: "doc",
      content: [
        /* test content */
      ],
    };
    const context = {
      errors: [],
      cache: new Map(),
    };

    const result = await plugin.processContent(content, context);

    expect(result).toMatchObject({
      // Expected structure
    });
  });

  test("handles errors properly", async () => {
    const plugin = new MyPlugin();
    const context = { errors: [] };

    await plugin.processContent(null, context);

    expect(context.errors).toHaveLength(1);
    expect(context.errors[0].message).toMatch(/expected error/i);
  });
});
```

## Plugin Development Tips

1. **Debugging**

   ```javascript
   if (context.environment === "development") {
     console.log("Processing:", context.currentFile);
   }
   ```

2. **Caching**

   ```javascript
   const cacheKey = "my-plugin:some-key";
   context.cache.set(cacheKey, data, ttlMs);
   ```

3. **Resource Cleanup**

   ```javascript
   async afterCollect(context) {
     // Clean up resources
     this.cleanup();
   }
   ```

4. **Plugin Communication**
   ```javascript
   // Store shared data in context
   context.myPlugin = {
     sharedData: "value",
   };
   ```

For more information and updates, visit:

- [GitHub Repository](https://github.com/uniwebcms/site-content-collector)
- [Documentation](https://github.com/uniwebcms/site-content-collector/docs)
- [Issue Tracker](https://github.com/uniwebcms/site-content-collector/issues)
