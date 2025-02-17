// src/plugins/image-meta.js
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ProcessorPlugin } from "../core/plugin.js";
import { readYamlFile } from "../core/utils.js";

export class ImageMetadataPlugin extends ProcessorPlugin {
  constructor(options = {}) {
    super(options);
    this.options = {
      sidecarExt: ".yml",
      publicDir: "public",
      ...options,
    };
  }

  async processContent(content, context) {
    if (!content || !content.type || content.type !== "doc") {
      return content;
    }

    try {
      // Process the content recursively
      await this.#processNode(content, context);
      return content;
    } catch (err) {
      this.addError(context, `Image metadata processing error: ${err.message}`);
      return content;
    }
  }

  async #processNode(node, context) {
    // Process image nodes
    if (node.type === "image") {
      await this.#enrichImageNode(node, context);
    }

    // Recursively process child nodes
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        await this.#processNode(child, context);
      }
    }
  }

  async #enrichImageNode(node, context) {
    const { src } = node.attrs || {};
    if (!src) return;

    try {
      // Get the full path to the image and its metadata
      const imagePath = this.#resolveImagePath(src, context);
      const metadataPath = imagePath + this.options.sidecarExt;

      // Read metadata file
      let metadata = await readYamlFile(metadataPath);

      // Update node attributes with metadata if available
      if (typeof metadata === "object" && !Array.isArray(metadata)) {
        // Preserve inline title and alt if present
        const title = metadata.title || metadata.caption;
        const alt = metadata.alt;

        if (title && !node.attrs.title) node.attrs.title = title;
        if (alt && !node.attrs.alt) node.attrs.alt = alt;

        node.attrs.metadata = metadata;
      }

      // Check if the file is an SVG
      if (src.toLowerCase().endsWith(".svg")) {
        try {
          // Read the SVG file content and save it as "svg" content
          node.attrs.svg = await readFile(imagePath, "utf8");
        } catch (svgErr) {
          this.addError(
            context,
            `Failed to read SVG content for ${src}: ${svgErr.message}`
          );
        }
      }

      // Remove any undefined or null values
      Object.keys(node.attrs).forEach((key) => {
        if (node.attrs[key] === undefined || node.attrs[key] === null) {
          delete node.attrs[key];
        }
      });
    } catch (err) {
      this.addError(
        context,
        `Failed to process image metadata for ${src}: ${err.message}`
      );
    }
  }

  #resolveImagePath(src, context) {
    // Handle absolute paths
    if (src.startsWith("/")) {
      return resolve(
        context.resourcePath,
        this.options.publicDir,
        src.slice(1)
      );
    }

    // Handle relative paths
    const currentDir = dirname(context.currentFile);
    return resolve(currentDir, src);
  }

  static async validateMetadata(metadata) {
    const schema = {
      alt: "string?",
      caption: "string?",
      title: "string?",
      dimensions: {
        width: "number?",
        height: "number?",
      },
      optimization: {
        quality: "number?",
        format: "string?",
      },
    };

    // Basic validation - could be enhanced with a proper schema validator
    if (metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      if (width && typeof width !== "number")
        throw new Error("Width must be a number");
      if (height && typeof height !== "number")
        throw new Error("Height must be a number");
    }

    if (metadata.optimization) {
      const { quality, format } = metadata.optimization;
      if (
        quality &&
        (typeof quality !== "number" || quality < 0 || quality > 100)
      ) {
        throw new Error("Quality must be a number between 0 and 100");
      }
      if (format && !["webp", "jpeg", "png"].includes(format)) {
        throw new Error("Invalid format specified");
      }
    }

    return true;
  }
}

// Example metadata YAML file structure:
/*
alt: "A beautiful sunset"
caption: "Sunset over the mountains"
dimensions:
  width: 1920
  height: 1080
optimization:
  quality: 85
  format: webp
credit: "Photo by John Doe"
license: "CC BY 4.0"
*/
