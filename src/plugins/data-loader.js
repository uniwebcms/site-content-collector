// src/plugins/data-loader.js
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LoaderPlugin } from "../core/plugin.js";
import { Cache } from "../core/utils.js";

export class DataLoaderPlugin extends LoaderPlugin {
  #cache;

  constructor(options = {}) {
    super(options);
    this.#cache = new Cache();
  }

  async beforeCollect(context) {
    // Clear cache at the start of collection
    this.#cache.clear();
  }

  async loadData(source, context) {
    if (!source) return null;

    // Handle different source types
    if (typeof source === "string") {
      return this.#loadFromString(source, context);
    }

    if (typeof source === "object") {
      return this.#loadFromConfig(source, context);
    }

    return null;
  }

  async #loadFromString(source, context) {
    // Check if it's a URL
    try {
      const url = new URL(source);
      return this.#loadFromUrl(url.toString(), context);
    } catch {
      // Not a URL, treat as file path
      return this.#loadFromFile(source, context);
    }
  }

  async #loadFromConfig(config, context) {
    const { url, path, revalidate, fallback } = config;

    if (url) {
      return this.#loadFromUrl(url, context, {
        revalidate,
        fallback,
      });
    }

    if (path) {
      return this.#loadFromFile(path, context);
    }

    return null;
  }

  async #loadFromFile(path, context) {
    try {
      // Resolve path relative to current section
      const fullPath = join(context.resourcePath, path);

      const content = await readFile(fullPath, "utf8");
      return JSON.parse(content);
    } catch (err) {
      this.addError(
        context,
        `Failed to load data from file ${path}: ${err.message}`
      );
      return null;
    }
  }

  async #loadFromUrl(url, context, options = {}) {
    const { revalidate = 3600, fallback } = options;
    const cacheKey = `url:${url}`;

    // Check cache first
    if (this.#cache.has(cacheKey)) {
      return this.#cache.get(cacheKey);
    }

    try {
      const data = await this.fetchWithTimeout(url);
      this.#cache.set(cacheKey, data, revalidate * 1000);
      return data;
    } catch (err) {
      this.addError(
        context,
        `Failed to fetch data from ${url}: ${err.message}`
      );

      // Try fallback if provided
      if (fallback) {
        return this.#loadFromFile(fallback, context);
      }

      return null;
    }
  }
}
