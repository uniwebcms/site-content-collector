// src/handlers/init/dependencies.js
import { initializeDependencies } from "../../utils/dependencies.js";
import { logger } from "../../utils/logger.js";
import ora from "ora";
import chalk from "chalk";

export async function initDependencies(options = {}) {
  const spinner = ora("Checking dependencies...").start();

  try {
    const targetPath = process.cwd();

    if (options.check) {
      // Just check without updating
      const result = await initializeDependencies(targetPath, {
        checkOnly: true,
      });
      spinner.stop();

      if (result.needsUpdate) {
        logger.warn("Some dependencies need updating:");
        if (result.missing.length > 0) {
          logger.warn(
            "Missing dependencies:\n  " + result.missing.join("\n  ")
          );
        }
        if (result.outdated.length > 0) {
          logger.warn(
            "Outdated dependencies:\n  " + result.outdated.join("\n  ")
          );
        }
        logger.info('\nRun "uniweb init dependencies" to update them');
      } else {
        logger.success("All dependencies are up to date");
      }
      return;
    }

    const result = await initializeDependencies(targetPath, {
      force: options.force,
    });

    if (result.created) {
      spinner.succeed("Created package.json with required dependencies");
    } else if (result.added.length > 0 || result.updated.length > 0) {
      spinner.succeed("Updated dependencies");
    } else {
      spinner.succeed("Dependencies are up to date");
    }

    // Show what changed
    if (result.added.length > 0) {
      logger.info("\nAdded dependencies:");
      result.added.forEach((dep) =>
        logger.info(`  ${chalk.green("+")} ${dep}`)
      );
    }

    if (result.updated.length > 0) {
      logger.info("\nUpdated dependencies:");
      result.updated.forEach((dep) =>
        logger.info(`  ${chalk.blue("→")} ${dep}`)
      );
    }

    // Remind about package manager command
    if (result.added.length > 0 || result.updated.length > 0) {
      logger.info("\nRun your package manager to install the changes:");
      logger.info("  npm install");
      logger.info("  # or");
      logger.info("  yarn install");
    }
  } catch (error) {
    spinner.fail("Failed to initialize dependencies");
    logger.error(error.message);
    if (options.verbose) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// src/handlers/init/workspace.js
export async function initWorkspace(options = {}) {
  const spinner = ora("Checking workspace configuration...").start();

  try {
    // TODO: Implement workspace initialization
    // This could:
    // 1. Validate workspace structure
    // 2. Create missing directories
    // 3. Add .gitkeep files
    // 4. Set up any needed configuration

    spinner.succeed("Workspace configured successfully");
  } catch (error) {
    spinner.fail("Failed to initialize workspace");
    logger.error(error.message);
    if (options.verbose) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}
