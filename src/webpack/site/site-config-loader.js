import { readFile, stat } from "fs/promises";
import { join } from "path";
import yaml from "js-yaml";

/**
 * Parse a module string to extract URL and version, resolving relative paths
 * @param {string} moduleString - Module string that may contain @version
 * @param {Object} context - Context object containing basePublicUrl
 * @returns {Object} Object containing resolved url and version
 */
function parseModuleString(moduleString, context) {
  const versionMatch = moduleString.match(/(.+)@(.+)/);

  let url, version;

  if (versionMatch) {
    url = versionMatch[1];
    version = versionMatch[2];
  } else {
    url = moduleString;
    version = "latest";
  }

  // Resolve relative paths if needed
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = resolveRelativePath(url, context);
  }

  return { url, version };
}

/**
 * Resolve a relative URL path using the base public URL
 * @param {string} path - The path to resolve
 * @param {Object} context - Context object containing basePublicUrl
 * @returns {string} Fully qualified URL
 */
function resolveRelativePath(path, context) {
  if (!context || !context.basePublicUrl) {
    throw new Error(
      "Invalid module configuration: unable to resolve relative path"
    );
  }

  const baseUrl = context.basePublicUrl.endsWith("/")
    ? context.basePublicUrl.slice(0, -1)
    : context.basePublicUrl;

  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Process a module configuration that is an object
 * @param {Object} moduleConfig - Module configuration object
 * @returns {Object} Processed module information
 */
function processModuleObject(moduleConfig) {
  // Extract properties from the object
  const url = moduleConfig.url || "";
  const module = moduleConfig.module || "";
  let version = moduleConfig.version || "latest";

  // Validate required fields
  if (!url) {
    throw new Error(
      "Invalid module configuration in site.yml. Required field: url"
    );
  }

  // Ensure URL is properly formatted
  let formattedUrl = url.endsWith("/") ? url.slice(0, -1) : url;
  if (module) formattedUrl += "/" + module;

  return {
    url: formattedUrl,
    version,
  };
}

/**
 * Fetch the latest version for a module
 * @param {string} baseUrl - Base URL for the module
 * @returns {Promise<string>} The resolved version
 */
async function fetchLatestVersion(baseUrl) {
  const versionUrl = `${baseUrl}/latest_version.txt`;
  console.log(`Reading latest version from ${versionUrl}`);

  const response = await fetch(versionUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch latest version: ${response.statusText}`);
  }

  return (await response.text()).trim();
}

function processModuleInfo(module, context) {
  if (!module) {
    throw new Error("Missing module information");
  }

  if (typeof module === "string") {
    return parseModuleString(module, context);
  }

  if (typeof config.module === "object") {
    return processModuleObject(module);
  }

  throw new Error("Module configuration must be a string or an object");
}

/**
 * Loads and processes the site configuration from site.yml.
 * For component modules, it resolves the full URL including the version hash.
 * If version is set to 'latest', it fetches the current hash from the module's server.
 *
 * @param {string} sitePath - Path to the site's root directory containing site.yml
 * @param {Object} context - Context object containing basePublicUrl
 * @returns {Promise<Object>} The complete site configuration object
 *
 * @example
 * // site.yml example:
 * // module: https://uniwebcms.github.io/AcademicModules/M1@latest
 *
 * const config = await loadSiteConfig('./my-site');
 * console.log(config.components.moduleUrl);
 * // => https://uniwebcms.github.io/AcademicModules/M1/1.0.2
 *
 * @throws {Error} If site.yml is not found
 * @throws {Error} If components configuration is invalid
 * @throws {Error} If latest version fetch fails
 */
async function loadSiteConfig(sitePath, context) {
  // Read and parse site.yml
  const ymlPath = join(sitePath, "site.yml");

  // Check if file exists
  try {
    await stat(ymlPath);
  } catch (error) {
    throw new Error("site.yml not found");
  }

  const configContent = await readFile(ymlPath, "utf8");
  const config = yaml.load(configContent);
  const module = processModuleInfo(config.module);

  // Fetch latest version if needed
  if (module.version === "latest") {
    module.version = await fetchLatestVersion(module.url);
  }

  // Add the resolved module URL to the config
  config.moduleUrl = `${module.url}/${module.version}`;

  // Remove the original module params
  delete config.module;

  return config;
}

export { loadSiteConfig };
