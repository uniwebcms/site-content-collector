#!/usr/bin/env node

import { createCLI } from "../src/cli/collect.js";

// Run the CLI
createCLI()
  .then((program) => program.parse())
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
