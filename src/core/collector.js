// src/core/collector.js
import { readFile, readdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import yaml from "js-yaml";
import { markdownToProseMirror } from "@uniwebcms/content-reader";
import { Project, Site, Page, Section } from "@uniwebcms/dev-tools";
import { PluginRegistry } from "./plugin.js";
import {
  readYamlFile,
  isMarkdownFile,
  parseNumericPrefix,
  compareFilenames,
  createError,
} from "./utils.js";

export class ContentCollector {
  #plugins;
  #context;

  constructor(config = {}) {
    this.#plugins = new PluginRegistry();
    this.#context = {
      config,
      environment: process.env.NODE_ENV,
      errors: [],
      cache: new Map(),
      currentFile: null,
      resourcePath: null,
    };
  }

  use(plugin, dependencies = []) {
    this.#plugins.register(plugin, dependencies);
    return this;
  }

  async collect(rootPath) {
    this.#context.resourcePath = rootPath;

    try {
      await this.#runHooks("beforeCollect");
      const output = await this.#processRoot(rootPath);
      await this.#runHooks("afterCollect");

      if (this.#context.environment === "development") {
        output.errors = this.#context.errors;
      }

      return output;
    } catch (error) {
      this.#context.errors.push({
        phase: "collection",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
      throw error;
    }
  }

  async #runHooks(hookName) {
    const plugins = this.#plugins.getOrderedPlugins();
    for (const plugin of plugins) {
      if (typeof plugin[hookName] === "function") {
        await plugin[hookName](this.#context);
      }
    }
  }

  async #processRoot(rootPath) {
    const project = new Project(rootPath);
    const site = new Site("/", project);
    // const siteConfig = await readYamlFile(join(rootPath, "site.yml"));
    // const themeConfig = await readYamlFile(join(rootPath, "theme.yml"));
    // const contentPath = join(rootPath, "pages"); // get relative contentPath instead?
    const siteConfig = await site.loadConfig();
    const themeConfig = await site.loadTheme();
    const contentPath = site.pagesDir;

    const output = {
      pages: [],
      config: siteConfig,
      theme: themeConfig,
    };

    // Read directory entries
    const entries = await readdir(contentPath).catch((err) => {
      if (err.code === "ENOENT") return [];
      throw err;
    });

    const specials = ["header", "footer", "left", "right"];

    // Process each directory as a potential page
    await Promise.all(
      entries.map(async (entry) => {
        // const path = join(contentPath, entry);
        // const isDir = await stat(path).then((stats) => stats.isDirectory());
        // if (!isDir) return;

        try {
          // const config = await page.loadConfig();
          // const page = await this.#processPage(path, entry);
          const page = await this.#processPage(entry, site);
          if (!page) return;

          const suffix = page.route.startsWith("/@") && page.route.slice(2);
          if (suffix && specials.includes(suffix)) output[suffix] = page;
          else output.pages.push(page);
        } catch (err) {
          console.log("PAGE PROCESS ERROR", err.message);
          this.#context.errors.push({
            page: entry,
            message: err.message,
            stack:
              process.env.NODE_ENV === "development" ? err.stack : undefined,
          });
        }
      })
    );

    return output;
  }

  async #processPage(relPagePath, site) {
    const page = new Page(relPagePath, site);

    if (!(await page.exists())) return null;

    this.#context.currentFile = page.dirPath;

    let { sections, hidden, ...pageMetadata } = await page.loadConfig();

    if (hidden) return null;
    // const files = await readdir(page.dirPath); //pagePath

    if (!sections || !Array.isArray(sections) || !sections.length) {
      const files = await readdir(page.dirPath);
      sections = files.filter(isMarkdownFile).sort(compareFilenames);
    }

    sections = page.initSections(sections);

    // // Get directory contents and page metadata
    // const [files, pageMetadata] = await Promise.all([
    //   readdir(pagePath),
    //   readYamlFile(join(pagePath, "page.yml")),
    // ]);

    // // Process each markdown file as a section
    // const sections = await Promise.all(
    //   files
    //     .filter(isMarkdownFile)
    //     .sort(compareFilenames)
    //     .map((file) => this.#processSection(file, page)) //join(pagePath, file)
    // );

    // Process each markdown file as a section
    sections = await Promise.all(
      sections.map((section) => this.#processSection(section))
    );

    // console.log({ sections });

    // Filter out null sections and build hierarchy
    // const validSections = sections.filter(Boolean);
    // const hierarchy = this.#buildSectionHierarchy(validSections);

    // Check for subpages
    const subpages = await this.#processSubpages(page);

    return {
      route: "/" + page.route,
      ...pageMetadata,
      sections,
      // sections: hierarchy,
      ...(subpages.length > 0 && { subpages }),
    };
  }

  async #processSubpages(parentPage) {
    const entries = await readdir(parentPage.dirPath);
    const subpages = [];

    for (const entry of entries) {
      const pagePath = join(parentPage.dirPath, entry);
      const stats = await stat(pagePath);

      if (stats.isDirectory()) {
        try {
          const relPath = join(parentPage.path, entry);
          const subpage = await this.#processPage(relPath, parentPage.site);
          if (subpage) subpages.push(subpage);
        } catch (err) {
          this.#context.errors.push({
            page: entry,
            message: `Failed to process subpage: ${err.message}`,
            stack:
              process.env.NODE_ENV === "development" ? err.stack : undefined,
          });
        }
      }
    }

    return subpages;
  }

  async #processSection(section) {
    // const section = new Section(filePath, page);
    // const { name } = parse(filePath);
    // const { prefix, name: baseName } = parseNumericPrefix(name);

    // // Skip files without numeric prefix if required by config
    // if (this.#context.config.requireNumericPrefix && !prefix) {
    //   return null;
    // }

    // // Skip files that start with "_"
    // if (name.startsWith("_")) {
    //   return null;
    // }

    try {
      const content = await readFile(section.filePath, "utf8");
      const processed = await this.#processMarkdown(content);

      // Run content through processor plugins
      for (const plugin of this.#plugins.getOrderedPlugins()) {
        if (plugin.processContent) {
          processed.content = await plugin.processContent(processed.content, {
            ...this.#context,
            currentSection: section.filePath,
          });
        }
      }

      const subsections = await Promise.all(
        section.subsections.map((child) => this.#processSection(child))
      );

      return {
        id: section.name,
        // title: baseName,
        ...processed,
        subsections,
      };
    } catch (err) {
      throw createError(`Failed to process section ${section.name}`, {
        cause: err,
        path: section.filePath,
      });
    }
  }

  async #processMarkdown(content) {
    let frontMatter = {};
    let markdown = content;

    // Process front matter if present
    if (content.trim().startsWith("---")) {
      const parts = content.split("---\n");
      if (parts.length >= 3) {
        try {
          frontMatter = yaml.load(parts[1]) || {};
          markdown = parts.slice(2).join("---\n");
        } catch (err) {
          throw createError("Invalid front matter", { cause: err });
        }
      }
    }

    let { component, preset, input, ...params } = frontMatter;

    // Load input data if specified
    if (input) {
      for (const plugin of this.#plugins.getOrderedPlugins()) {
        if (plugin.loadData) {
          try {
            input = await plugin.loadData(input, this.#context);
          } catch (err) {
            throw createError("Failed to load input data", { cause: err });
          }
        }
      }
    }

    // Convert markdown to ProseMirror JSON structure
    const proseMirrorContent = markdownToProseMirror(markdown);

    return {
      component,
      preset,
      input,
      params,
      content: proseMirrorContent,
    };
  }

  #buildSectionHierarchy(sections) {
    const sectionMap = new Map();
    const topLevel = [];

    // First pass: create map of all sections
    for (const section of sections) {
      sectionMap.set(section.id, section);
    }

    // Second pass: build hierarchy
    for (const section of sections) {
      if (!section.id.includes(".")) {
        topLevel.push(section);
        continue;
      }

      const parts = section.id.split(".");
      const parentId = parts.slice(0, -1).join(".");
      const parent = sectionMap.get(parentId);

      if (!parent) {
        throw createError(
          `Parent section ${parentId} not found for ${section.id}`
        );
      }

      parent.subsections.push(section);
      // Sort subsections by ID
      parent.subsections.sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true })
      );
    }

    // Sort top-level sections by ID
    return topLevel.sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );
  }
}
