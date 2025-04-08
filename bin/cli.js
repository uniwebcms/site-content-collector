#!/usr/bin/env node
import { Command } from "commander";
import { getPackageData } from "./utils/package.js";

import { ToolHandler } from "@uniwebcms/dev-tools";
import chalk from "chalk";

async function setupCLI() {
  const packageData = await getPackageData();
  const program = new Command();
  const toolHandler = new ToolHandler();

  program
    .name("uniweb")
    .description(
      "Uniweb development toolkit for managing sites, modules and components"
    )
    .version(packageData.version || "1.0.0")
    .option("--verbose", "enable verbose output")
    .option("--debug", "enable debug mode");

  // console.dir(toolHandler.getCLICommands(), { depth: 3 });
  toolHandler.registerCommands(program, packageData, chalk);

  return program;
}

// Run the CLI
setupCLI()
  .then((program) => program.parse())
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
