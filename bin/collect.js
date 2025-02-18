// src/cli/collect.js
import { Command } from "commander";
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname, extname } from "node:path";
import { createCollector } from "../index.js";

export async function createCLI() {
  const program = new Command();

  program
    .name("collect-content")
    .description("Collect website content from a directory structure")
    .version(process.env.npm_package_version || "2.0.0")
    .argument("<source>", "Source directory containing website content")
    .argument("<output>", "Output path (directory or .json file)")
    .option("-p, --pretty", "Pretty print JSON output", false)
    .option("-v, --verbose", "Enable verbose logging", false)
    .option(
      "--require-prefix",
      "Require numeric prefixes for section files",
      false
    )
    .option("--no-data-loader", "Disable data loader plugin")
    .option("--no-image-meta", "Disable image metadata plugin")
    .action(async (source, output, options) => {
      try {
        const sourcePath = resolve(source);
        const outputPath = resolve(output);

        // Configure collector based on CLI options
        const config = {
          requireNumericPrefix: options.requirePrefix,
          dataLoader: options.dataLoader !== false && {},
          imageMeta: options.imageMeta !== false && {},
          plugins: [],
        };

        if (options.verbose) {
          console.log("Configuration:", JSON.stringify(config, null, 2));
          console.log("Processing content from:", sourcePath);
        }

        // Collect content
        const collector = createCollector(config);
        const content = await collector.collect(sourcePath);

        // Determine output path and format
        let outputFilePath = outputPath;
        if (!extname(outputPath)) {
          // If output is a directory, create it and use default filename
          await mkdir(outputPath, { recursive: true });
          outputFilePath = join(outputPath, "site-content.json");
        } else {
          // Ensure output directory exists
          await mkdir(dirname(outputFilePath), { recursive: true });

          // Validate extension
          if (extname(outputFilePath) !== ".json") {
            throw new Error("Output file must have .json extension");
          }
        }

        // Write output
        const jsonString = options.pretty
          ? JSON.stringify(content, null, 2)
          : JSON.stringify(content);

        await writeFile(outputFilePath, jsonString, "utf8");

        if (options.verbose) {
          console.log("Content written to:", outputFilePath);
          if (content.errors?.length > 0) {
            console.warn("Errors encountered:", content.errors);
          }
        }
      } catch (error) {
        console.error("Error:", error.message);
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return program;
}
