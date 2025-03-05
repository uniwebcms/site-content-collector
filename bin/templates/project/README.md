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

## 📚 Learn More

Visit [uniweb.io](https://uniweb.io) or explore our [documentation](https://docs.uniweb.io).
