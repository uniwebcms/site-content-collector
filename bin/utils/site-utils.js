// src/utils/site-utils.js
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger.js";

/**
 * Finds the maximum numeric suffix used in filenames or folder names matching
 * the given prefix and optional extension in the specified directory.
 * Returns 1 if no matching items are found.
 *
 * @param {string} directory - The directory path to search in
 * @param {string} prefix - The filename/folder prefix to match
 * @param {string} [extension] - Optional file extension (with or without leading dot)
 * @returns {Promise<number>} - The maximum suffix found, or 1 if no matches
 * @throws {Error} - If directory doesn't exist or other filesystem errors
 */
export async function findMaxSuffix(directory, prefix, extension = null) {
  try {
    // Read all items in the directory
    const items = await fs.readdir(directory);

    // Create regex pattern based on whether extension is provided
    let pattern;
    if (extension) {
      // For files with extension
      const ext = extension.startsWith(".") ? extension : `.${extension}`;
      pattern = new RegExp(`^${prefix}(\\d+)${ext.replace(".", "\\.")}$`);
    } else {
      // For folders or files without extension
      pattern = new RegExp(`^${prefix}(\\d+)$`);
    }

    // Find all matching suffixes and convert to numbers
    const suffixes = items
      .map((itemName) => {
        const match = itemName.match(pattern);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((suffix) => suffix !== null);

    // Return maximum suffix found or 1 if no matches
    return suffixes.length > 0 ? Math.max(...suffixes) : 1;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Directory not found: ${directory}`);
    }
    throw error; // Re-throw other errors
  }
}

// /**
//  * Generate a unique site ID based on existing sites
//  * @param {string[]} existingSites Array of existing site names
//  * @returns {number} Next available site number
//  */
// export function generateSiteId(existingSites) {
//   if (!existingSites.length) return 1;

//   const numbers = existingSites
//     .map((name) => {
//       const match = name.match(/site(\d+)/);
//       return match ? parseInt(match[1]) : 0;
//     })
//     .filter((num) => !isNaN(num));

//   return numbers.length ? Math.max(...numbers) + 1 : 1;
// }

/**
 * Validate site name according to naming rules
 * @param {string} name The site name to validate
 * @throws {Error} If name is invalid
 */
export function validateSiteName(name) {
  if (!name) {
    throw new Error("Site name is required");
  }

  // Only allow lowercase letters, numbers, and hyphens
  const validNameRegex = /^[a-z0-9-]+$/;
  if (!validNameRegex.test(name)) {
    throw new Error(
      "Site name can only contain lowercase letters, numbers, and hyphens"
    );
  }

  // Don't allow names starting with numbers (unless it's our auto-generated "site1" format)
  if (!name.startsWith("site") && /^\d/.test(name)) {
    throw new Error(
      'Site name cannot start with a number unless using the "siteN" format'
    );
  }

  // Set reasonable length limits
  if (name.length < 2 || name.length > 50) {
    throw new Error("Site name must be between 2 and 50 characters long");
  }

  // Prevent consecutive hyphens
  if (name.includes("--")) {
    throw new Error("Site name cannot contain consecutive hyphens");
  }

  // Don't allow hyphens at start or end
  if (name.startsWith("-") || name.endsWith("-")) {
    throw new Error("Site name cannot start or end with a hyphen");
  }
}

/**
 * Copy template files to the new site directory
 * @param {string} templateName Name of the template to use
 * @param {string} targetPath Path where files should be copied
 */
export async function copyTemplateFiles(templateName, targetPath) {
  // TODO: Implement actual template system
  // This is a basic implementation - you'll need to:
  // 1. Define where templates are stored
  // 2. Implement template processing (e.g., variable substitution)
  // 3. Handle template-specific configuration

  const templatePath = path.join(process.cwd(), "templates", templateName);

  try {
    // Basic file structure for a site
    await fs.mkdir(path.join(targetPath, "pages"), { recursive: true });
    await fs.mkdir(path.join(targetPath, "public"), { recursive: true });

    // Create basic files
    await fs.writeFile(
      path.join(targetPath, "pages", "home.md"),
      "# Welcome\n\nThis is your new Uniweb site."
    );

    await fs.writeFile(
      path.join(targetPath, "README.md"),
      `# ${path.basename(
        targetPath
      )}\n\nA Uniweb site created with template: ${templateName}`
    );

    logger.info(`Created basic file structure using template: ${templateName}`);
  } catch (error) {
    throw new Error(`Failed to copy template files: ${error.message}`);
  }
}
