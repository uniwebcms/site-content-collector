// src/utils/templates.js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get list of available site templates
 * @returns {Promise<string[]>} Array of template names
 */
export async function getAvailableSiteTemplates() {
  // TODO: Implement proper template discovery
  // This should:
  // 1. Look in a defined templates directory
  // 2. Handle both built-in and user-defined templates
  // 3. Validate template structure
  // 4. Read template metadata

  try {
    // For now, return basic templates that we know exist
    return ["basic", "docs", "marketing"];
  } catch (error) {
    console.error("Error reading templates:", error);
    return ["basic"]; // Return at least the basic template
  }
}

/**
 * Get template configuration and metadata
 * @param {string} templateName Name of the template
 * @returns {Promise<Object>} Template configuration
 */
export async function getTemplateConfig(templateName) {
  // TODO: Implement template configuration reading
  // This should:
  // 1. Read template's config file
  // 2. Validate configuration
  // 3. Provide default values

  return {
    name: templateName,
    description: "A Uniweb site template",
    version: "1.0.0",
    files: ["pages/", "public/", "README.md", "uniweb.config.json"],
  };
}
