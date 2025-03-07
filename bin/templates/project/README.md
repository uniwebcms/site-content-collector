# Uniweb Framework

**Freedom for content creators. Flexibility for developers.**

Uniweb solves a fundamental challenge in web development: keeping content and code separate while maintaining a cohesive website experience.

## 🔍 The Problem

In traditional web development:

- Content changes require developer involvement
- Component updates risk breaking content
- Multiple sites duplicate component code
- Content and development teams block each other

## 💡 The Uniweb Solution

Uniweb creates a clean runtime connection between content and components:

```
📄 Content (Markdown + Front Matter)
   |
   ▼
🔗 Runtime Connection (Module Federation)
   |
   ▼
🧩 Components (React Library)
```

## 🏗 Architecture in Action

### Content Side

```markdown
---
component: ProductSection
featured: true
---

# Featured Products

Our most popular items this season.

- Free shipping on all items
- 30-day money back guarantee
- 24/7 customer support

## Wireless Headphones

Premium sound with 24-hour battery life.
![Headphones](./headphones.jpg)
[Learn more](#)

## Smart Speaker

Voice-controlled assistant for your home.
![Speaker](./speaker.jpg)
[Learn more](#)
```

### How It's Parsed

```javascript
// This is how the markdown is structured for components
content = {
  main: {
    title: "Featured Products",
    text: "Our most popular items this season.",
    list: [
      "Free shipping on all items",
      "30-day money back guarantee",
      "24/7 customer support",
    ],
  },
  subs: [
    {
      title: "Wireless Headphones",
      text: "Premium sound with 24-hour battery life.",
      images: [{ alt: "Headphones", src: "/pages/products/headphones.jpg" }],
      links: [{ text: "Learn more", href: "#" }],
    },
    {
      title: "Smart Speaker",
      text: "Voice-controlled assistant for your home.",
      images: [{ alt: "Speaker", src: "/pages/products/speaker.jpg" }],
      links: [{ text: "Learn more", href: "#" }],
    },
  ],
};
```

### Component Side

```javascript
function ProductSection({ content, params }) {
  const { main, subs } = content;
  const { featured } = params;

  return (
    <section className={featured ? "featured-section" : "regular-section"}>
      <SectionHeader title={main.title} description={main.text} />

      {main.list.length > 0 && (
        <div className="benefits">
          {main.list.map((item, i) => (
            <div key={i} className="benefit-item">
              <CheckIcon /> {item}
            </div>
          ))}
        </div>
      )}

      <div className="product-grid">
        {subs.map((product, i) => (
          <ProductCard
            key={i}
            title={product.title}
            description={product.text}
            image={product.images[0]}
            link={product.links[0]}
          />
        ))}
      </div>
    </section>
  );
}
```

## 🔄 How It Works

1. **One Site, One Library**: Each content site connects to exactly one component library module
2. **Runtime Loading**: Components load at runtime, not build time
3. **Clear Contract**: Content structure is predictable, components have a defined API
4. **Content Structure**: Markdown is parsed into a `main` part and `subs` parts
5. **Independent Updates**: Content and components can be updated separately

## 👥 For Content Teams

- **True Independence**: Update content without developer help
- **Simple Authoring**: Write in markdown with straightforward configuration
- **Immediate Preview**: See changes instantly due to the runtime connection
- **Consistent Experience**: Rely on components handling presentation

## 👨‍💻 For Developers

- **Build Once, Use Everywhere**: Create component libraries for multiple sites
- **Update Without Risk**: Improve components without rebuilding sites
- **Clean Development**: Focus on component logic without content distractions
- **Controlled Evolution**: Migrate components gradually with versioning

## 📂 Independent Repository Structure

Uniweb enables completely separate repositories for content and code:

```
# Content Repository
content-site/
├── pages/              # Markdown content (each page is a folder)
│   └── product/        # Example page folder
│       ├── 1-intro.md  # Main content file
│       ├── 2-specs.md  # Additional content file
│       └── image.jpg   # Page-specific image
├── public/             # Static assets (shared across pages)
│   └── images/         # Shared images
├── src/                # Minimal bootstrapping code
├── site.yml            # Points to a remote component library
├── package.json        # Dependencies
└── webpack.config.js   # Site bundling config

# Component Repository (can be hosted separately)
component-library/
├── src/                # Component source files
├── package.json        # Dependencies
└── webpack.config.js   # Module bundling config
```

## 🔧 Technical Implementation

At its core, Uniweb uses webpack 5 module federation to connect content and components at runtime, rather than bundling them together at build time. This creates a true separation of concerns while maintaining high performance.

## 🛠 Ecosystem Components

- **@uniwebcms/runtime**: Core rendering engine with routing and data handling
- **@uniwebcms/basics**: Foundation components for common patterns
- **@uniwebcms/toolkit**: Project scaffolding and management tools

## 🏁 Quick Start

The following example creates both a site and a module in the same project for development convenience. In production, these would typically exist in separate repositories.

```bash
# Install the toolkit
npm install -g @uniwebcms/toolkit

# Create your project with a site
uniweb init site

# Add a module for local development
uniweb add module my-components

# Connect the site to your local module
uniweb use my-components

# Add your first components
uniweb add component Hero
uniweb add component Features

# Create content using your components
uniweb add page home --components "Hero, Features"

# Start development
uniweb dev
```

For production setups, you would create separate repositories for your content site and component library, with the site referencing the deployed component library URL in its configuration.

## Enabling TypeScript Support (Optional)

This project does not enforce TypeScript by default, but **TypeScript support is pre-configured** in the provided Webpack config code. If you want to use TypeScript, follow the steps below to install the necessary dependencies.

### 1. Install Required Dependencies

If you want to use TypeScript, install the following dependencies:

```sh
yarn add -D typescript @types/react @types/react-dom @babel/preset-typescript
```

- `typescript` → Provides TypeScript tooling (but Babel handles transpilation).
- `@types/react` & `@types/react-dom` → Provide TypeScript support for React components.
- `@babel/preset-typescript` → Allows Babel to strip TypeScript syntax while transpiling `.tsx` files.

This setup works identically in both:

- Yarn Classic Mode (node_modules)
- Yarn Plug’n’Play (PnP) (no extra setup required).

### 2. Configure TypeScript (tsconfig.jsonc)

Create a `tsconfig.jsonc` file at the root of your project if you haven’t already:

```json
{
  "compilerOptions": {
    "target": "ESNext", // Use the latest JavaScript features
    "module": "ESNext", // Keep import/export statements for Webpack/Babel
    "lib": ["DOM", "ESNext"], // Enable DOM and modern JavaScript APIs
    "jsx": "react-jsx", // Enable JSX for React
    "strict": true, // Enable strict mode for better type safety
    "moduleResolution": "Node" // Resolve imports like Node.js
  },
  "exclude": ["node_modules", "dist"],
  "files": ["src/_types/global.d.ts"] // Load global type definitions
}
```

### 3. Configure VS Code for TypeScript (Optional)

**If Using Yarn PnP**

If you’re using Yarn PnP, run this command to enable TypeScript support in VS Code:

yarn dlx @yarnpkg/sdks vscode

Additionally, update .vscode/settings.json:

```json
{
  "typescript.tsdk": ".yarn/sdks/typescript/lib"
}
```

Then restart VS Code to apply the changes.

**If Using Yarn Classic (node_modules)**

No additional steps are needed—VS Code should work out of the box.

### 4. Optional: Type Checking

Since Babel does not check types, you may want to run TypeScript’s type checker separately:

```sh
yarn tsc --noEmit
```

This ensures that TypeScript validates your code without generating any files.

### 5. Optional: Using TypeScript in Your Project

Once TypeScript is enabled, you can start using it in .ts and .tsx files:

```tsx
import React from "react";

interface Props {
  name: string;
}

const Hello: React.FC<Props> = ({ name }) => {
  return <h1>Hello, {name}!</h1>;
};

export default Hello;
```

## 📚 Learn More

Visit [uniweb.io](https://uniweb.io) or explore our [documentation](https://docs.uniweb.io).
