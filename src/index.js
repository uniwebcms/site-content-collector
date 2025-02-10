const { readFile, readdir, stat } = require("fs/promises");
const { join, parse } = require("path");
const yaml = require("js-yaml");
const { markdownToProseMirror } = require("@uniwebcms/content-reader");

const VALID_EXTENSIONS = new Set([".md", ".json"]);

async function readYamlFile(path) {
  try {
    const content = await readFile(path, "utf8");
    return yaml.load(content) || {};
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function processMarkdown(content = "") {
  let component = null;
  let props = {};
  let markdown = content;

  if (content.trim().startsWith("---")) {
    const parts = content.split("---\n");
    if (parts.length >= 3) {
      try {
        const frontMatter = yaml.load(parts[1]);
        component = frontMatter?.component || null;
        props = frontMatter?.props || {};
        markdown = parts.slice(2).join("---\n");
      } catch (err) {
        throw new Error(`Invalid front matter: ${err.message}`);
      }
    }
  }

  return {
    component,
    props,
    content: markdownToProseMirror(markdown),
  };
}

function validateSectionData(data) {
  const { component, props, content } = data;
  if (component !== null && typeof component !== "string") {
    throw new Error("Component must be null or string");
  }
  if (!props || typeof props !== "object") {
    throw new Error("Props must be an object");
  }
  if (!content) {
    throw new Error("Content is required");
  }
  return data;
}

async function processSection(filePath) {
  const { name, ext } = parse(filePath);
  const [prefix] = name.split("-");

  if (!prefix.match(/^\d+(\.\d+)*$/)) return null;

  const content = await readFile(filePath, "utf8");
  let processed;

  try {
    if (ext === ".md") {
      processed = await processMarkdown(content);
    } else if (ext === ".json") {
      const data = JSON.parse(content);
      processed = validateSectionData(data);
    } else {
      return null;
    }
  } catch (err) {
    throw new Error(`Failed to process ${name}: ${err.message}`);
  }

  return {
    id: prefix,
    title: name.slice(prefix.length + 1),
    ...processed,
    subsections: [],
  };
}

function buildSectionHierarchy(sections) {
  sections.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );

  const sectionMap = new Map();
  const topLevel = [];

  sections.forEach((section) => {
    sectionMap.set(section.id, section);
  });

  sections.forEach((section) => {
    const parts = section.id.split(".");
    if (parts.length === 1) {
      topLevel.push(section);
    } else {
      const parentId = parts.slice(0, -1).join(".");
      const parent = sectionMap.get(parentId);
      if (!parent) {
        throw new Error(
          `Parent section ${parentId} not found for ${section.id}`
        );
      }
      parent.subsections.push(section);
    }
  });

  return topLevel;
}

async function processPage(pagePath) {
  const [files, pageMetadata] = await Promise.all([
    readdir(pagePath),
    readYamlFile(join(pagePath, "page.yml")),
  ]);

  const sections = await Promise.all(
    files
      .filter((file) => VALID_EXTENSIONS.has(parse(file).ext))
      .map((file) => processSection(join(pagePath, file)))
  );

  return {
    metadata: pageMetadata,
    sections: buildSectionHierarchy(sections.filter(Boolean)),
  };
}

async function collectSiteContent(rootPath) {
  const output = {
    siteMetadata: await readYamlFile(join(rootPath, "site.yml")),
    pages: {},
    errors: [],
  };

  const entries = await readdir(rootPath);
  const dirStats = await Promise.all(
    entries.map(async (entry) => {
      const path = join(rootPath, entry);
      const isDir = await stat(path).then((stats) => stats.isDirectory());
      return isDir ? entry : null;
    })
  );

  await Promise.all(
    dirStats.filter(Boolean).map(async (dir) => {
      try {
        output.pages[dir] = await processPage(join(rootPath, dir));
      } catch (err) {
        output.errors.push({ page: dir, error: err.message });
      }
    })
  );

  return output;
}

module.exports = { collectSiteContent };
