// src/handlers/create/module.js
import path from "node:path";
import fs from "node:fs/promises";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { fileURLToPath } from "node:url";
import {
  findMaxSuffix,
  copyTemplateFiles,
  validateSiteName,
} from "../../utils/site-utils.js";
import { applyTemplate, TEMPLATE_TYPES } from "../../utils/templates.js";
import { createSiteConfig } from "../../utils/config.js";
import { logger } from "../../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createModuleHandler(name, options = {}) {
  // Initialize options with defaults
  const {
    template = "basic",
    description = "",
    path: targetPath = process.cwd(),
  } = options;

  // If no name provided, generate one
  let siteName = name;
  if (!siteName) {
    const maxId = await findMaxSuffix(targetPath, "site");
    siteName = `site${maxId + 1}`;
    logger.info(
      `No site name provided, using generated name: ${chalk.cyan(siteName)}`
    );
  } else {
    // Validate name if provided
    validateSiteName(siteName);
  }

  // Get templates and validate selection
  const templates = await getAvailableSiteTemplates();
  if (!templates.includes(template)) {
    const choices = templates.map((t) => ({
      name: t.charAt(0).toUpperCase() + t.slice(1),
      value: t,
    }));

    const { selectedTemplate } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedTemplate",
        message: `Template '${template}' not found. Please select a template:`,
        choices,
      },
    ]);

    options.template = selectedTemplate;
  }

  // Set up site directory
  const sitePath = path.join(targetPath, siteName);
  const spinner = ora(`Creating site ${chalk.cyan(siteName)}...`).start();

  try {
    // Check if directory already exists
    try {
      await fs.access(sitePath);
      spinner.fail(`Directory ${chalk.cyan(sitePath)} already exists`);
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: "Directory already exists. Overwrite?",
          default: false,
        },
      ]);

      if (!overwrite) {
        logger.error("Site creation cancelled");
        process.exit(1);
      }
    } catch (err) {
      // Directory doesn't exist, which is what we want
    }

    // Create directory
    await fs.mkdir(sitePath, { recursive: true });

    // Copy template files
    await copyTemplateFiles(options.template, sitePath);

    // Create site configuration
    await createSiteConfig(sitePath, {
      name: siteName,
      description,
      template: options.template,
      createdAt: new Date().toISOString(),
    });

    spinner.succeed(
      `Site ${chalk.cyan(siteName)} created successfully at ${chalk.cyan(
        sitePath
      )}`
    );

    // Show next steps
    logger.info("\nNext steps:");
    logger.info(`  cd ${siteName}`);
    logger.info("  uniweb use module --name <moduleName> --for " + siteName);
    logger.info("  uniweb dev --site " + siteName);
  } catch (error) {
    spinner.fail(`Failed to create site: ${error.message}`);
    // Try to clean up if we created the directory
    try {
      await fs.rm(sitePath, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

async function getExistingSites(basePath) {
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const sites = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("site")) {
        // Check if it's a valid site directory (has uniweb.config.json)
        try {
          const configPath = path.join(
            basePath,
            entry.name,
            "uniweb.config.json"
          );
          await fs.access(configPath);
          sites.push(entry.name);
        } catch (err) {
          // Not a uniweb site, skip
        }
      }
    }

    return sites;
  } catch (error) {
    logger.error("Error reading directory:", error.message);
    return [];
  }
}
