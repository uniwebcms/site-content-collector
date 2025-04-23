#!/usr/bin/env node
import { Command } from "commander";
import { getPackageData } from "./utils/package.js";
import { ToolHandler } from "@uniwebcms/dev-tools";
import chalk from "chalk";
import { table } from "table";

try {
  const packageData = await getPackageData();
  const info = {
    name: "uniweb",
    description: "Manager for sites and modules",
    version: packageData.version,
    peerDependencies: packageData.peerDependencies,
  };

  const program = new Command();
  const toolHandler = new ToolHandler();
  toolHandler.registerCommands(program, info, { chalk, table });
  program.parse(); // Run the CLI
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}

// async function setupCLI() {
//   const packageData = await getPackageData();
//   const program = new Command();
//   const toolHandler = new ToolHandler();

//   packageData.name = "uniweb";
//   packageData.description =
//     "Toolkit for managing sites, modules and components";

//   toolHandler.registerCommands(program, packageData, chalk);

//   return program;
// }

// // Run the CLI
// setupCLI()
//   .then((program) => program.parse())
//   .catch((error) => {
//     console.error("Fatal error:", error);
//     process.exit(1);
//   });
