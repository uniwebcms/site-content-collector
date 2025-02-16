// src/core/utils.js

import { readFile } from "node:fs/promises";
import yaml from "js-yaml";

export async function readYamlFile(path) {
  try {
    const content = await readFile(path, "utf8");
    return yaml.load(content) || {};
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export function parseNumericPrefix(filename) {
  const match = filename.match(/^(\d+(?:\.\d+)*)-(.+)$/);
  if (!match) return { prefix: null, name: filename };
  return { prefix: match[1], name: match[2] };
}

export function compareFilenames(a, b) {
  const parseA = parseNumericPrefix(a);
  const parseB = parseNumericPrefix(b);

  // If both have numeric prefixes, compare them
  if (parseA.prefix && parseB.prefix) {
    return parseA.prefix.localeCompare(parseB.prefix, undefined, {
      numeric: true,
    });
  }

  // If only one has a prefix, it comes first
  if (parseA.prefix) return -1;
  if (parseB.prefix) return 1;

  // Otherwise, compare alphabetically (case-insensitive)
  return parseA.name.localeCompare(parseB.name, undefined, {
    sensitivity: "base",
  });
}

export function createError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

export class Cache {
  #store = new Map();
  #timeouts = new Map();

  set(key, value, ttl = null) {
    this.#store.set(key, value);

    if (ttl) {
      // Clear any existing timeout
      if (this.#timeouts.has(key)) {
        clearTimeout(this.#timeouts.get(key));
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        this.#store.delete(key);
        this.#timeouts.delete(key);
      }, ttl);

      this.#timeouts.set(key, timeout);
    }
  }

  get(key) {
    return this.#store.get(key);
  }

  has(key) {
    return this.#store.has(key);
  }

  delete(key) {
    if (this.#timeouts.has(key)) {
      clearTimeout(this.#timeouts.get(key));
      this.#timeouts.delete(key);
    }
    return this.#store.delete(key);
  }

  clear() {
    for (const timeout of this.#timeouts.values()) {
      clearTimeout(timeout);
    }
    this.#timeouts.clear();
    this.#store.clear();
  }
}

export function getExtension(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  return ext ? `.${ext}` : "";
}

export function isMarkdownFile(filename) {
  return getExtension(filename) === ".md";
}

export function isSidecarFile(filename) {
  return getExtension(filename) === ".yml";
}
