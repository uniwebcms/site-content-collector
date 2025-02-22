#!/usr/bin/env node
import { Command } from "commander";
// import packageData from "../package.json" assert { type: "json" };
import { getPackageData } from "./utils/package.js";

// Import handlers (implementation will be provided by you)
import {
  createSite,
  createModule,
  createComponent,
  useModule,
  collectContent,
  buildSite,
  buildModule,
  removeSite,
  removeModule,
  removeComponent,
  startDevServer,
  listResources,
  getResourceInfo,
  validateResource,
  initDependencies,
  initWorkspace,
} from "./handlers/index.js";

async function setupCLI() {
  const packageData = await getPackageData(); // packageData.version
  const program = new Command();

  program
    .name("uniweb")
    .description(
      "Uniweb development toolkit for managing sites, modules and components"
    )
    .version(packageData.version || "1.0.0");

  // ===== CREATE COMMANDS =====
  const createCommand = program
    .command("create")
    .description("Create a new resource");

  createCommand
    .command("site")
    .description("Create a new site")
    .argument(
      "[name]",
      "Name of the site (defaults to site1, site2, etc. if not provided)"
    )
    .option("--template <template>", "Template to use (default: basic)")
    .option("--description <text>", "Brief description of the site")
    .option(
      "--path <path>",
      "Custom path for creation (default: current directory)"
    )
    .action(async (name, options) => {
      await createSite(name, options);
    });

  createCommand
    .command("module")
    .description("Create a new component module")
    .argument(
      "[name]",
      "Name of the module (defaults to module1, module2, etc. if not provided)"
    )
    .option("--template <template>", "Template to use (default: basic)")
    .option("--description <text>", "Brief description of the module")
    .option(
      "--path <path>",
      "Custom path for creation (default: current directory)"
    )
    .action(async (name, options) => {
      await createModule(name, options);
    });

  createCommand
    .command("component")
    .description("Create a new component")
    .requiredOption("--name <name>", "Name of the component")
    .option(
      "--module <moduleName>",
      "Target module (defaults to most recent module)"
    )
    .option(
      "--type <type>",
      "Type of component: section, block, or element",
      "section"
    )
    .option("--export", "Make component exportable", false)
    .option("--shared", "Create in shared folder", false)
    .option("--description <text>", "Brief description of the component")
    .option(
      "--parameters <params>",
      'Initial parameters (format: "align:string,items:number")'
    )
    .option("--config <path>", "Path to JSON configuration file")
    .action(async (options) => {
      await createComponent(options);
    });

  // ===== USE COMMANDS =====
  const useCommand = program
    .command("use")
    .description("Use a resource with another resource");

  useCommand
    .command("module")
    .description("Link a module to a site")
    .option("--name <moduleName>", "Name of the module to use")
    .option("--url <moduleUrl>", "URL of the remote module to use")
    .requiredOption("--for <siteName>", "Site to apply the module to")
    .option("--local", "Use the module locally rather than as a URL", false)
    .action(async (options) => {
      if (!options.name && !options.url) {
        console.error("Error: Either --name or --url must be provided");
        process.exit(1);
      }
      await useModule(options);
    });

  // ===== COLLECT COMMANDS =====
  const collectCommand = program
    .command("collect")
    .description("Collect resources");

  collectCommand
    .command("content")
    .description("Collect website content from a directory structure")
    .requiredOption(
      "--source <dir>",
      "Source directory containing website content"
    )
    .requiredOption("--output <path>", "Output path (directory or .json file)")
    .option("--pretty", "Pretty print JSON output", false)
    .option("--verbose", "Enable verbose logging", false)
    .option(
      "--require-prefix",
      "Require numeric prefixes for section files",
      false
    )
    .option("--no-data-loader", "Disable data loader plugin")
    .option("--no-image-meta", "Disable image metadata plugin")
    .action(async (options) => {
      await collectContent(options);
    });

  // ===== BUILD COMMANDS =====
  const buildCommand = program
    .command("build")
    .description("Build a site or module");

  buildCommand
    .command("site")
    .description("Build a site")
    .option("--name <siteName>", "Name of the site to build")
    .option("--production", "Build for production", false)
    .option("--output <dir>", "Output directory")
    .option("--analyze", "Analyze bundle size", false)
    .option("--verbose", "Enable verbose logging", false)
    .action(async (options) => {
      await buildSite(options);
    });

  buildCommand
    .command("module")
    .description("Build a module")
    .option("--name <moduleName>", "Name of the module to build")
    .option("--production", "Build for production", false)
    .option("--output <dir>", "Output directory")
    .option("--analyze", "Analyze bundle size", false)
    .option("--verbose", "Enable verbose logging", false)
    .action(async (options) => {
      await buildModule(options);
    });

  // ===== REMOVE COMMANDS =====
  const removeCommand = program
    .command("remove")
    .description("Remove a resource")
    .alias("rm");

  removeCommand
    .command("site")
    .description("Remove a site")
    .requiredOption("--name <siteName>", "Name of the site to remove")
    .option("--force", "Force removal without confirmation", false)
    .action(async (options) => {
      await removeSite(options);
    });

  removeCommand
    .command("module")
    .description("Remove a module")
    .requiredOption("--name <moduleName>", "Name of the module to remove")
    .option("--force", "Force removal without confirmation", false)
    .action(async (options) => {
      await removeModule(options);
    });

  removeCommand
    .command("component")
    .description("Remove a component")
    .requiredOption("--name <name>", "Name of the component to remove")
    .requiredOption("--module <moduleName>", "Module containing the component")
    .option("--force", "Force removal without confirmation", false)
    .action(async (options) => {
      await removeComponent(options);
    });

  // ===== DEV COMMAND =====
  program
    .command("dev")
    .description("Start development server")
    .option("--site <siteName>", "Site to serve")
    .option("--port <number>", "Port to use", 3000)
    .option("--host <host>", "Host to bind to", "localhost")
    .option("--open", "Open browser automatically", false)
    .action(async (options) => {
      await startDevServer(options);
    });

  // ===== LIST COMMAND =====
  const listCommand = program
    .command("list")
    .description("List available resources")
    .alias("ls");

  listCommand
    .command("sites")
    .description("List all sites")
    .option("--format <format>", "Output format: table, json", "table")
    .action(async (options) => {
      await listResources("sites", options);
    });

  listCommand
    .command("modules")
    .description("List all modules")
    .option("--site <siteName>", "Filter by site")
    .option("--format <format>", "Output format: table, json", "table")
    .action(async (options) => {
      await listResources("modules", options);
    });

  listCommand
    .command("components")
    .description("List all components")
    .option("--module <moduleName>", "Filter by module")
    .option("--type <type>", "Filter by type: section, block, element")
    .option("--format <format>", "Output format: table, json", "table")
    .action(async (options) => {
      await listResources("components", options);
    });

  // ===== INFO COMMAND =====
  const infoCommand = program
    .command("info")
    .description("Show detailed information about a resource");

  infoCommand
    .command("site")
    .description("Show site information")
    .requiredOption("--name <siteName>", "Name of the site")
    .option("--format <format>", "Output format: table, json", "table")
    .action(async (options) => {
      await getResourceInfo("site", options);
    });

  infoCommand
    .command("module")
    .description("Show module information")
    .requiredOption("--name <moduleName>", "Name of the module")
    .option("--format <format>", "Output format: table, json", "table")
    .action(async (options) => {
      await getResourceInfo("module", options);
    });

  infoCommand
    .command("component")
    .description("Show component information")
    .requiredOption("--name <name>", "Name of the component")
    .requiredOption("--module <moduleName>", "Module containing the component")
    .option("--format <format>", "Output format: table, json", "table")
    .action(async (options) => {
      await getResourceInfo("component", options);
    });

  // ===== VALIDATE COMMAND =====
  const validateCommand = program
    .command("validate")
    .description("Validate a resource");

  validateCommand
    .command("site")
    .description("Validate a site")
    .requiredOption("--name <siteName>", "Name of the site")
    .option("--fix", "Attempt to fix issues", false)
    .option("--verbose", "Show detailed validation results", false)
    .action(async (options) => {
      await validateResource("site", options);
    });

  validateCommand
    .command("module")
    .description("Validate a module")
    .requiredOption("--name <moduleName>", "Name of the module")
    .option("--fix", "Attempt to fix issues", false)
    .option("--verbose", "Show detailed validation results", false)
    .action(async (options) => {
      await validateResource("module", options);
    });

  // ===== INIT COMMANDS =====
  const initCommand = program
    .command("init")
    .description("Initialize project configuration");

  initCommand
    .command("dependencies")
    .description("Initialize or update project dependencies")
    .option(
      "--force",
      "Force update all dependencies to match peer requirements"
    )
    .option("--check", "Only check for outdated dependencies without updating")
    .action(async (options) => {
      await initDependencies(options);
    });

  // Could add other init subcommands later:
  initCommand
    .command("workspace")
    .description("Initialize or validate workspace configuration")
    .action(async (options) => {
      await initWorkspace(options);
    });

  return program;
}

// Run the CLI
// const program = setupCLI();
// program.parse(process.argv);
setupCLI()
  .then((program) => program.parse())
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
