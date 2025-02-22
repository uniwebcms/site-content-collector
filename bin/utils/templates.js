// src/utils/templates.js
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import yaml from "js-yaml";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "../templates");

// Cache for compiled templates
const templateCache = new Map();

// Define valid template types
export const TEMPLATE_TYPES = {
  SITE: "site",
  MODULE: "module",
  COMPONENT: "component",
};

/**
 * Check if a directory exists
 */
async function dirExists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Clean up a directory in case of failure
 */
async function cleanup(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    logger.warn(`Failed to clean up ${targetPath}: ${error.message}`);
  }
}

/**
 * Check if string contains unresolved Handlebars placeholders
 */
function hasUnresolvedPlaceholders(content) {
  const patterns = [
    /\{\{[^}]+\}\}/, // {{variable}}
    /\{\{#[^}]+\}\}/, // {{#block}}
    /\{\{\/[^}]+\}\}/, // {{/block}}
    /\{\{>[^}]+\}\}/, // {{>partial}}
  ];

  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Load and compile a Handlebars template with caching
 */
async function loadTemplate(templatePath) {
  try {
    if (templateCache.has(templatePath)) {
      return templateCache.get(templatePath);
    }

    const template = await fs.readFile(templatePath, "utf8");
    const compiled = Handlebars.compile(template);
    templateCache.set(templatePath, compiled);
    return compiled;
  } catch (error) {
    throw new Error(
      `Failed to load template ${templatePath}: ${error.message}`
    );
  }
}

/**
 * Create a file from a template with placeholder validation
 */
async function createFileFromTemplate(templatePath, targetPath, data) {
  try {
    const template = await loadTemplate(templatePath);
    const content = template(data);

    if (hasUnresolvedPlaceholders(content)) {
      const missingVars = content
        .match(/\{\{([^}]+)\}\}/g)
        ?.map((match) => match.slice(2, -2).trim())
        .filter(
          (v) => !v.startsWith("#") && !v.startsWith("/") && !v.startsWith(">")
        )
        .join(", ");

      logger.warn(
        `Warning: Possible unresolved placeholders in ${path.basename(
          targetPath
        )}: ${missingVars}`
      );
    }

    await fs.writeFile(targetPath, content);
    logger.debug(`Created file: ${targetPath}`);
  } catch (error) {
    throw new Error(`Failed to create file from template: ${error.message}`);
  }
}

/**
 * Copy a directory structure recursively, processing templates with progress tracking
 */
async function copyDirectoryStructure(
  sourcePath,
  targetPath,
  templateData,
  parentPath = ""
) {
  try {
    if (await dirExists(targetPath)) {
      logger.warn(
        `Directory ${targetPath} already exists. Files may be overwritten.`
      );
    }

    await fs.mkdir(targetPath, { recursive: true });
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    const total = entries.length;
    let current = 0;

    for (const entry of entries) {
      current++;
      const relativePath = path.join(parentPath, entry.name);
      logger.debug(`Processing ${current}/${total}: ${relativePath}`);

      const sourceName = entry.name;
      const targetName = sourceName.endsWith(".hbs")
        ? sourceName.slice(0, -4)
        : sourceName;
      const sourceFullPath = path.join(sourcePath, sourceName);
      const targetFullPath = path.join(targetPath, targetName);

      if (entry.isDirectory()) {
        await copyDirectoryStructure(
          sourceFullPath,
          targetFullPath,
          templateData,
          relativePath
        );
      } else {
        if (sourceName.endsWith(".hbs")) {
          await createFileFromTemplate(
            sourceFullPath,
            targetFullPath,
            templateData
          );
        } else {
          await fs.copyFile(sourceFullPath, targetFullPath);
        }
      }
    }
  } catch (error) {
    await cleanup(targetPath);
    throw new Error(`Failed to copy directory structure: ${error.message}`);
  }
}

/**
 * Get the template path for a given type
 */
function getTemplatePath(templateType) {
  const templatePath = path.join(TEMPLATES_DIR, templateType);
  return templatePath;
}

/**
 * Apply a template structure to a target directory
 */
export async function applyTemplate(
  templateType,
  targetPath,
  templateData = {}
) {
  if (!Object.values(TEMPLATE_TYPES).includes(templateType)) {
    throw new TypeError(`Invalid template type: ${templateType}`);
  }

  if (typeof targetPath !== "string") {
    throw new TypeError("Target path must be a string");
  }

  const templatePath = getTemplatePath(templateType);

  try {
    // Verify template exists
    await fs.access(templatePath);

    // Copy and process template structure
    await copyDirectoryStructure(templatePath, targetPath, templateData);

    logger.info(`Applied ${templateType} template to ${targetPath}`);
  } catch (error) {
    if (error.code === "EACCES") {
      throw new Error(`Permission denied accessing template: ${error.message}`);
    } else {
      throw new Error(`Failed to apply template: ${error.message}`);
    }
  }
}
