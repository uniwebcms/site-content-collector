#!/usr/bin/env node

const { program } = require("commander");
const { resolve } = require("path");
const { writeFile, mkdir } = require("fs/promises");
const { collectSiteContent } = require("../src/index");

program
  .name("collect-content")
  .description(
    "Process website content from a source directory into a JSON structure"
  )
  .version("1.0.0")
  .arguments("<source> <target>")
  .option("-p, --pretty", "Pretty print JSON output", false)
  .option("-v, --verbose", "Show verbose output", false)
  .action(async (source, target, options) => {
    try {
      const sourcePath = resolve(process.cwd(), source);
      const targetPath = resolve(process.cwd(), target);

      if (options.verbose) {
        console.log(`Processing content from ${sourcePath}`);
        console.log(`Output will be saved to ${targetPath}`);
      }

      const content = await collectSiteContent(sourcePath);

      // Create target directory if it doesn't exist
      await mkdir(targetPath, { recursive: true });

      // Write the output
      const jsonContent = JSON.stringify(content, null, options.pretty ? 2 : 0);
      await writeFile(resolve(targetPath, "site-content.json"), jsonContent);

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
