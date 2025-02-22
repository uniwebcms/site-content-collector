// src/utils/logger.js
import chalk from "chalk";

/**
 * Simple logger utility with colored output
 */
export const logger = {
  info: (message, ...args) => {
    console.log(chalk.blue("info"), message, ...args);
  },

  success: (message, ...args) => {
    console.log(chalk.green("success"), message, ...args);
  },

  warn: (message, ...args) => {
    console.log(chalk.yellow("warning"), message, ...args);
  },

  error: (message, ...args) => {
    console.error(chalk.red("error"), message, ...args);
  },

  debug: (message, ...args) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray("debug"), message, ...args);
    }
  },

  // For command completion messages
  done: (message, ...args) => {
    console.log(chalk.green("✔"), message, ...args);
  },

  // For progress updates
  progress: (message, ...args) => {
    console.log(chalk.cyan("→"), message, ...args);
  },
};

// Add utility methods
logger.group = console.group;
logger.groupEnd = console.groupEnd;

// Add timing utilities
logger.time = (label) => {
  console.time(chalk.cyan(label));
};

logger.timeEnd = (label) => {
  console.timeEnd(chalk.cyan(label));
};
