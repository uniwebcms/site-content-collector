// src/core/plugin.js

export class ContentPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  // Lifecycle hooks
  async beforeCollect(context) {}
  async afterCollect(context) {}

  // Error handling
  /*protected*/ addError(context, error) {
    const errorObj = error instanceof Error ? error : new Error(error);
    context.errors.push({
      plugin: this.constructor.name,
      message: errorObj.message,
      stack:
        process.env.NODE_ENV === "development" ? errorObj.stack : undefined,
    });
  }
}

export class ProcessorPlugin extends ContentPlugin {
  async processContent(content, context) {
    return content;
  }
}

export class LoaderPlugin extends ContentPlugin {
  async loadData(source, context) {
    return null;
  }

  /*protected*/ async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class TransformerPlugin extends ContentPlugin {
  async transform(data, context) {
    return data;
  }
}

// Plugin registry to manage plugin dependencies and ordering
export class PluginRegistry {
  #plugins = new Map();
  #dependencies = new Map();

  register(plugin, dependencies = []) {
    const name = plugin.constructor.name;
    this.#plugins.set(name, plugin);
    this.#dependencies.set(name, dependencies);
    return this;
  }

  get(name) {
    return this.#plugins.get(name);
  }

  getOrderedPlugins() {
    const visited = new Set();
    const result = [];

    const visit = (name) => {
      if (visited.has(name)) return;
      visited.add(name);

      const dependencies = this.#dependencies.get(name) || [];
      for (const dep of dependencies) {
        if (!this.#plugins.has(dep)) {
          throw new Error(`Missing plugin dependency: ${dep}`);
        }
        visit(dep);
      }

      result.push(this.#plugins.get(name));
    };

    for (const name of this.#plugins.keys()) {
      visit(name);
    }

    return result;
  }
}
