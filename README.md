# @uniwebcms/site-content-collector

A Node.js library that processes website content from a structured folder hierarchy into a standardized JSON format. The library reads content files (Markdown and JSON) and metadata (YAML), organizing them into a complete site structure that preserves page hierarchy and section ordering.

## Key Features

- Processes nested folder structures where each folder represents a page
- Handles both Markdown and JSON content files
- Supports section hierarchies through numeric prefixes (e.g., `2.1-feature.md` is nested under `2-features.md`)
- Converts Markdown to ProseMirror/TipTap JSON format
- Preserves page and section metadata
- Processes files in parallel for optimal performance

## Installation

```bash
npm install @uniwebcms/site-content-collector
```

## File Structure Convention

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

Content files must follow these conventions:

1. Must have a numeric prefix (e.g., `1-`, `2.1-`) that determines order and hierarchy
2. Must use either `.md` or `.json` extension
3. Files without numeric prefixes are ignored

#### Markdown Files

```markdown
---
component: Hero # Optional component name
props: # Optional component properties
  background: ./bg.jpg
---

# Section Title

Content in Markdown format
```

#### JSON Files

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

### Metadata Files

- `site.yml`: Site-wide configuration and metadata
- `page.yml`: Page-specific metadata (optional in each page folder)

## Usage

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

### Output Structure

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

## Performance

The library is designed for performance:

- Processes files in parallel using Promise.all
- Uses async/await for non-blocking I/O
- Efficiently builds section hierarchies using Map

## Requirements

- Node.js >=14.0.0
- Files must follow the naming convention for proper processing
- Parent sections must exist for all subsections

## License

Apache 2.0 - see LICENSE for details
