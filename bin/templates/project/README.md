# Uniweb Framework Overview

## The Web Platform That Elegantly Separates Content From Code

Uniweb is an innovative open-source web framework that brings harmony to the development process by creating a clean separation between content and code. This separation allows content teams and developers to work independently, each focusing on their areas of expertise.

## What Makes Uniweb Different

Most web frameworks tightly couple content and code, requiring developer intervention for content changes. Uniweb takes a fundamentally different approach:

- **Content** is written in markdown files with front matter configuration
- **Components** live in separate, reusable modules
- They connect at runtime through a module federation system

This creates a web development workflow where:

- Content teams can update content without developer involvement
- Developers can improve components without disrupting content
- Multiple sites can share the same component libraries
- Teams can work in completely separate repositories if desired

## How Uniweb Works

Uniweb creates a clear separation between:

```
┌─────────────────────┐     ┌─────────────────────┐
│  Content Repository │     │   Code Repository   │
│  ─────────────────  │     │  ─────────────────  │
│                     │     │                     │
│  - Markdown content │     │  - Components       │
│  - Static assets    │ ◄── │  - Styling          │
│  - Configuration    │     │  - Logic            │
│                     │     │                     │
└─────────────────────┘     └─────────────────────┘
```

Content sites link to component modules at runtime using webpack module federation, allowing:

- Components to be updated without rebuilding sites
- Multiple sites to share component libraries
- Independent workflows for content and development teams

### On the Content Side: Markdown with Front Matter

Content creators work with simple markdown files that specify which component should render the content:

```markdown
---
component: ProductShowcase
layout: grid
featured: true
---

# Our Amazing Products

Discover our exceptional product line that delivers unmatched performance.

## Product One

This revolutionary product changes everything...

## Product Two

Our award-winning solution for demanding users...
```

### On the Code Side: Structured Component Convention

Developers create components that receive structured content and configuration parameters:

```javascript
function ProductShowcase({ content, params }) {
  // Structured content automatically parsed from markdown
  const { title, description } = content.main;
  const products = content.items;

  // Parameters from front matter
  const { layout = "grid", featured = false } = params;

  return (
    <div className={`product-showcase layout-${layout}`}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard product={product} featured={featured} />
        ))}
      </div>
    </div>
  );
}
```

## The Uniweb Ecosystem

Uniweb provides a complete ecosystem for building content-driven websites:

- **@uniwebcms/runtime**: React-based rendering engine with built-in routing, dynamic data fetching, and multilingual support
- **@uniwebcms/basics**: Essential building block components
- **@uniwebcms/toolkit**: CLI tools for project scaffolding and management

## Key Benefits

For **content teams**:

- Update content without developer dependencies
- Work in a content-focused environment
- Configure components through simple front matter
- Use components from any source

For **developers**:

- Create components once, use them across multiple sites
- Update components without rebuilding sites
- Work in a code-focused environment
- Evolve components from specific to general naturally
- Complete implementation freedom within components

## Uniweb's Approach

### Connected Through Convention

Instead of a tightly coupled interface between content and code, Uniweb creates a convention-based contract:

- Markdown is parsed into a predictable structure accessible via `content`
- Front matter is parsed into a parameters object accessible via `params`
- Components interpret this structure according to conventions

### Independent Repositories

This separation enables content and code to exist in completely separate repositories:

```
content-repository/
├── pages/            # Markdown content
├── public/           # Static assets
├── site.yml          # Links to a remote module
├── package.json      # Package configuration
└── webpack.config.js # Site engine bundling configuration

component-repository/
├── src/              # Component source files
├── package.json      # Package configuration
└── webpack.config.js # Module bundling configuration
```

Each site loads exactly one runtime module as its component library, which defines how all content should be presented. The module is referenced by a URL set in `site.yml`. Using a single library ensures design consistency and dependency compatibility across all components, from navigation and headers to content sections.

A site also includes Uniweb's core engine, which automatically handles infrastructure concerns like multilingual content, search, page hierarchy, and dynamic data management.

In summary, **a component library is a collection of components packaged as a runtime module**. Unlike traditional npm packages that are bundled at build time, this approach loads components at runtime.

## Technical Implementation

Under the hood, Uniweb uses webpack 5 module federation to implement the connection between an a site and its component library:

- Each site bundles the Uniweb runtime
- A component library is loaded at runtime via remote module federation
- The runtime parses markdown and provides structured content to components
- Components render the content according to their implementation

This creates a true separation of concerns while maintaining high performance.

## When to Use This Approach

Content/code separation is particularly valuable when:

- Content teams need autonomy for frequent updates
- Multiple sites share the same component library
- Organizations have separate content and development teams
- Projects need to evolve over a long lifespan
- Consistency across many content pages is important

## Getting Started

This guide will walk you through setting up your first Uniweb project and creating a **site project** and a **module project** on the same repository.

## Prerequisites

Before you begin, make sure you have:

- Node.js 16.x or higher
- npm 7.x or higher
- yarn 4.x or higher (recommended)

## Installation

First, install the Uniweb toolkit globally:

```bash
npm install -g @uniwebcms/toolkit
```

The `uniweb` command simplifies the process of scaffolding files and folders. Once you are familiar with the Uniweb Framework, you might may no longer need its help.

Let's create a site and a module, add a component to the module, and a page to the site.

Within a new git project:

```bash
# Initialize the project with a root-level site
uniweb init site

# Add a module project for a new component library named "my-lib"
uniweb add module my-lib

# Connect the site with the module
uniweb use my-lib

# Create a component named "HeroSection" to your new library
uniweb add component HeroSection

# Create a page named "home"
uniweb add page home --component HeroSection

# Create a hero section in the new home page
uniweb add section hero -in home --component HeroSection

# Start the dev server in watch mode
uniweb dev
```
