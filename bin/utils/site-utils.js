// src/utils/site-utils.js
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger.js";

/**
 * Generate a unique site ID based on existing sites
 * @param {string[]} existingSites Array of existing site names
 * @returns {number} Next available site number
 */
export function generateSiteId(existingSites) {
  if (!existingSites.length) return 1;

  const numbers = existingSites
    .map((name) => {
      const match = name.match(/site(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter((num) => !isNaN(num));

  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

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
