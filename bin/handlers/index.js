// src/handlers/index.js
import { createSiteHandler } from "./create/site.js";
import { createModuleHandler } from "./create/module.js";
import { createComponentHandler } from "./create/component.js";
import { useModuleHandler } from "./use/module.js";
// import { collectContentHandler } from "./collect/content.js";
// import { buildSiteHandler } from "./build/site.js";
// import { buildModuleHandler } from "./build/module.js";
// import { removeSiteHandler } from "./remove/site.js";
// import { removeModuleHandler } from "./remove/module.js";
// import { removeComponentHandler } from "./remove/component.js";
// import { startDevServerHandler } from "./dev/server.js";
// import { listResourcesHandler } from "./list/resources.js";
// import { getResourceInfoHandler } from "./info/resource.js";
// import { validateResourceHandler } from "./validate/resource.js";

export { initDependencies, initWorkspace } from "./init/dependencies.js";

// Create commands
export const createSite = async (name, options) => {
  try {
    await createSiteHandler(name, options);
  } catch (error) {
    console.error("Error creating site:", error.message);
    process.exit(1);
  }
};

export const createModule = async (name, options) => {
  try {
    await createModuleHandler(name, options);
  } catch (error) {
    console.error("Error creating module:", error.message);
    process.exit(1);
  }
};

export const createComponent = async (options) => {
  try {
    await createComponentHandler(options);
  } catch (error) {
    console.error("Error creating component:", error.message);
    process.exit(1);
  }
};

// Use commands
export const useModule = async (options) => {
  try {
    await useModuleHandler(options);
  } catch (error) {
    console.error("Error using module:", error.message);
    process.exit(1);
  }
};

// Collect commands
export const collectContent = async (options) => {
  try {
    await collectContentHandler(options);
  } catch (error) {
    console.error("Error collecting content:", error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

// Build commands
export const buildSite = async (options) => {
  try {
    await buildSiteHandler(options);
  } catch (error) {
    console.error("Error building site:", error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

export const buildModule = async (options) => {
  try {
    await buildModuleHandler(options);
  } catch (error) {
    console.error("Error building module:", error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

// Remove commands
export const removeSite = async (options) => {
  try {
    await removeSiteHandler(options);
  } catch (error) {
    console.error("Error removing site:", error.message);
    process.exit(1);
  }
};

export const removeModule = async (options) => {
  try {
    await removeModuleHandler(options);
  } catch (error) {
    console.error("Error removing module:", error.message);
    process.exit(1);
  }
};

export const removeComponent = async (options) => {
  try {
    await removeComponentHandler(options);
  } catch (error) {
    console.error("Error removing component:", error.message);
    process.exit(1);
  }
};

// Dev command
export const startDevServer = async (options) => {
  try {
    await startDevServerHandler(options);
  } catch (error) {
    console.error("Error starting development server:", error.message);
    process.exit(1);
  }
};

// List command
export const listResources = async (resourceType, options) => {
  try {
    await listResourcesHandler(resourceType, options);
  } catch (error) {
    console.error(`Error listing ${resourceType}:`, error.message);
    process.exit(1);
  }
};

// Info command
export const getResourceInfo = async (resourceType, options) => {
  try {
    await getResourceInfoHandler(resourceType, options);
  } catch (error) {
    console.error(`Error getting ${resourceType} info:`, error.message);
    process.exit(1);
  }
};

// Validate command
export const validateResource = async (resourceType, options) => {
  try {
    await validateResourceHandler(resourceType, options);
  } catch (error) {
    console.error(`Error validating ${resourceType}:`, error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};
