import { readFile, stat } from "fs/promises";
import { join } from "path";
import yaml from "js-yaml";

/**
 * Loads and processes the site configuration from site.yml.
 * For component modules, it resolves the full URL including the version hash.
 * If version is set to 'latest', it fetches the current hash from the module's server.
 *
 * @param {string} sitePath - Path to the site's root directory containing site.yml
 * @returns {Promise<Object>} The complete site configuration object
 *
 * @example
 * // site.yml example:
 * // components:
 * //   url: https://uniwebcms.github.io
 * //   module: AcademicModules/M1
 * //   version: latest  # or specific hash
 *
 * const config = await loadSiteConfig('./my-site');
 * console.log(config.components.moduleUrl);
 * // => https://uniwebcms.github.io/AcademicModules/M1/7edeff54-bee0-42bc-b4b8-059c0db4fbe2
 *
 * @throws {Error} If site.yml is not found
 * @throws {Error} If components configuration is invalid
 * @throws {Error} If latest version fetch fails
 */
async function loadSiteConfig(sitePath) {
  try {
    // Read and parse site.yml
    const ymlPath = join(sitePath, "site.yml");

    // Use stat() to check if file exists
    try {
      await stat(ymlPath);
    } catch (error) {
      throw new Error("site.yml not found");
    }

    // Replace readFileSync with readFile
    const configContent = await readFile(ymlPath, "utf8");
    const config = yaml.load(configContent);

    // Process component module configuration
    if (config.components) {
      if (!config.components.url || !config.components.module) {
        throw new Error(
          "Invalid module configuration in site.yml. Required fields: url, module"
        );
      }

      const { url, module, version = "latest" } = config.components;
      let moduleHash = version;

      // If version is 'latest', fetch the current hash
      if (version === "latest") {
        const versionUrl = `${url}/${module}/latest_version.txt`;
        console.log(`Reading latest version from ${versionUrl}`);
        const response = await fetch(versionUrl);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch latest version: ${response.statusText}`
          );
        }

        moduleHash = (await response.text()).trim();
      }

      // Add the resolved module URL to the config
      config.components.moduleUrl = `${url}/${module}/${moduleHash}`;
    }

    return config;
  } catch (error) {
    console.error("Error loading site configuration:", error.message);
    throw error;
  }
}

export { loadSiteConfig };
