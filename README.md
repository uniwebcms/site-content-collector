# @uniwebcms/site-content-collector

A Node.js library that processes website content from a structured folder hierarchy into a standardized JSON format. The library reads content files (Markdown and JSON) and metadata (YAML), organizing them into a complete site structure that preserves page hierarchy and section ordering.

## Installation

```bash
npm install @uniwebcms/site-content-collector
```

## Usage Methods

This library can be used in three ways:

1. As a Node.js module
2. As a CLI tool
3. As a webpack plugin

### Node.js Module

```javascript
const { collectSiteContent } = require("@uniwebcms/site-content-collector");

async function processWebsite() {
  try {
    const content = await collectSiteContent("./website");
    console.log(content);
  } catch (err) {
    console.error("Processing error:", err);
  }
}
```

### CLI Tool

Process content directly from the command line using `npx`:

```bash
# Output to directory (creates site-content.json)
npx collect-content ./source-dir ./output-dir

# Output to specific JSON file
npx collect-content ./source-dir ./output-dir/custom-name.json

# With pretty-printed JSON output
npx collect-content ./source-dir ./output.json --pretty

# With verbose logging
npx collect-content ./source-dir ./output.json --verbose
```

The CLI enforces these rules for safety:

- When specifying a directory, it creates `site-content.json` inside it
- When specifying a file, it must have a `.json` extension
- Creates output directories if they don't exist

### Webpack Plugin

The webpack plugin integrates content collection into your build process:

```javascript
const SiteContentPlugin = require("@uniwebcms/site-content-collector/webpack");

module.exports = {
  plugins: [
    new SiteContentPlugin({
      sourcePath: "./content/pages", // Required: path to content directory
      injectToHtml: true, // Optional: inject into HTML (requires html-webpack-plugin)
      variableName: "__SITE_CONTENT__", // Optional: id/variable name when injecting
      filename: "site-content.json", // Optional: output filename
      injectFormat: "json", // Optional: injection format ('json' or 'script')
    }),
  ],
};
```

#### HTML Injection Formats

The plugin supports two formats for injecting content into HTML:

1. JSON format (default):

```html
<script type="application/json" id="__SITE_CONTENT__">
  {
    "pages": {
      /* content */
    }
  }
</script>
```

Access in your code:

```javascript
const content = JSON.parse(
  document.getElementById("__SITE_CONTENT__").textContent
);
```

2. Script format:

```html
<script>
  window.__SITE_CONTENT__ = {
    /* content */
  };
</script>
```

Access in your code:

```javascript
const content = window.__SITE_CONTENT__;
```

## Content Structure

The library expects a folder structure organized as follows:

```
website/
├── site.yml               # Site-wide metadata and settings
├── home/                  # Each folder is a page
│   ├── page.yml          # Page-specific metadata
│   ├── 1-hero.md         # Section with prefix "1"
│   ├── 2-features.md     # Section with prefix "2"
│   └── 2.1-feature.md    # Subsection of "2"
└── about/
    ├── page.yml
    └── 1-intro.json      # JSON sections are also supported
```

### Content Files

The library processes two types of content files:

#### Markdown Files (.md)

```markdown
---
component: Hero # Optional component name
props: # Optional component properties
  background: ./bg.jpg
---

# Section Title

Content in Markdown format
```

#### JSON Files (.json)

```json
{
  "component": "Feature",
  "props": {
    "icon": "star"
  },
  "content": {
    "type": "doc",
    "content": [] // ProseMirror/TipTap format
  }
}
```

### File Naming Convention

Content files must follow these rules:

1. Must have a numeric prefix (e.g., `1-`, `2.1-`) that determines order and hierarchy
2. Must use either `.md` or `.json` extension
3. Files without numeric prefixes are ignored
4. Subsection numbers must reference existing parent sections (e.g., `2.1-` requires a `2-` section)

### Metadata Files

- `site.yml`: Site-wide configuration and metadata
- `page.yml`: Page-specific metadata (optional in each page folder)

## Output Structure

The library produces a JavaScript object with this structure:

```javascript
{
  siteMetadata: {
    // Contents of site.yml
  },
  pages: {
    home: {
      metadata: {
        // Contents of page.yml
      },
      sections: [
        {
          id: "1",
          title: "hero",
          component: "Hero",
          props: {},
          content: {},     // ProseMirror/TipTap JSON
          subsections: []  // Nested sections
        }
      ]
    }
  },
  errors: []  // Processing errors if any
}
```

## Error Handling

The library handles several types of errors:

- Missing parent sections for subsections
- Malformed YAML, JSON, or Markdown content
- Invalid file structure or naming
- Missing required files

Errors are collected in the `errors` array of the output, allowing processing to continue even when some files fail.

## Requirements

- Node.js >=14.0.0
- When using the webpack plugin, webpack >=5.0.0 is required

## License

Apache 2.0 - see LICENSE for details
