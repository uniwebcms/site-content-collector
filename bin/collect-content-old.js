#!/usr/bin/env node

const { program } = require("commander");
const { resolve, parse, join } = require("path");
const { writeFile, mkdir } = require("fs/promises");
const { collectSiteContent } = require("../src/index");

program
  .name("collect-content")
  .description(
    "Process website content from a source directory into a JSON structure"
  )
  .version("1.0.0")
  .arguments("<source> <output>")
  .option("-p, --pretty", "Pretty print JSON output", false)
  .option("-v, --verbose", "Show verbose output", false)
  .action(async (source, output, options) => {
    try {
      const sourcePath = resolve(process.cwd(), source);
      const outputPath = resolve(process.cwd(), output);

      if (options.verbose) {
        console.log(`Processing content from ${sourcePath}`);
      }

      // Validate output path
      const { ext, dir } = parse(outputPath);
      const isDirectory = !ext;

      if (!isDirectory && ext !== ".json") {
        throw new Error("Output file must have .json extension");
      }

      const content = await collectSiteContent(sourcePath);

      // Create output directory
      await mkdir(isDirectory ? outputPath : dir, { recursive: true });

      // Determine final output path
      const finalPath = isDirectory
        ? join(outputPath, "site-content.json")
        : outputPath;

      if (options.verbose) {
        console.log(`Output will be saved to ${finalPath}`);
      }

      // Write the output
      const jsonContent = JSON.stringify(content, null, options.pretty ? 2 : 0);
      await writeFile(finalPath, jsonContent);

      if (options.verbose) {
        console.log("Content processed successfully");
        if (content.errors.length > 0) {
          console.log("Warnings/Errors:", content.errors);
        }
      }
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });

program.parse();
