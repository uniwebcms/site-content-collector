# Uniweb Content Parsing Guide

## The Basics

When Uniweb parses markdown content, it produces a structured object with multiple access patterns. These patterns provide different levels of abstraction, from high-level (main/subs) to low-level (elements), allowing components to work with content in the way that best suits their needs.

## Content Structure at a Glance

```javascript
content = {
  main: { ... },      // Primary content part (if one exists)
  subs: [ ... ],      // All other content parts
  parts: [ ... ],     // All parts (including main)
  byType: { ... }     // Content organized by element type
}
```

## How Content Gets Divided

Uniweb divides your markdown content into parts in two ways:

1. **Using dividers**: If you include `---` lines in your markdown, Uniweb uses these to separate parts
2. **Using headings**: If there are no dividers, Uniweb uses heading structure to identify parts

In both cases, the first part may be classified as the `main` part if it has a higher-level heading than subsequent parts. The rest become `subs`.

**Note about heading groups**: Consecutive headings of decreasing order (like h1 followed by h2) are treated as a single heading group, not separate parts. This allows for creating subtitles within a section.

## Common Properties

Each content part contains these properties (all initialized with sensible defaults):

- `title` - The heading text
- `text` - All paragraphs combined
- `paragraphs` - Array of individual paragraphs
- `list` - Items from any lists
- `images` - Any images with src and alt
- `links` - Any links with href and text

## Examples

### Basic Example

This markdown:

```markdown
# Product Name

This is an amazing product.

- Feature one
- Feature two

## Specifications

Technical details here.
```

Becomes:

```javascript
{
  main: {
    title: "Product Name",
    text: "This is an amazing product.",
    list: ["Feature one", "Feature two"]
    // other properties initialized empty
  },
  subs: [
    {
      title: "Specifications",
      text: "Technical details here."
      // other properties initialized empty
    }
  ]
}
```

### Using Dividers

This markdown:

```markdown
# Introduction

Welcome overview.

---

## Features

Key features explained.
```

Becomes:

```javascript
{
  main: {
    title: "Introduction",
    text: "Welcome overview."
  },
  subs: [
    {
      title: "Features",
      text: "Key features explained."
    }
  ]
}
```

### Heading Groups Example

This markdown:

```markdown
# Main Title

## Subtitle

Content paragraph.

## Another Section

More content here.
```

Becomes:

```javascript
{
  main: {
    title: "Main Title",
    subtitle: "Subtitle",
    text: "Content paragraph."
  },
  subs: [
    {
      title: "Another Section",
      text: "More content here."
    }
  ]
}
```

## Tips for Component Developers

1. **For simple components**: Just use `main` and `subs`

   ```javascript
   function SimpleComponent({ content }) {
     const { main, subs } = content;
     return (
       <>
         <Header title={main.title} />
         <MainContent text={main.text} list={main.list} />
         {subs.map((sub) => (
           <SubSection key={sub.title} data={sub} />
         ))}
       </>
     );
   }
   ```

2. **For equal treatment**: Use `parts` when you want to treat all sections the same way

   ```javascript
   function EqualSections({ content }) {
     return (
       <div className="sections">
         {content.parts.map((part, i) => (
           <Section key={i} data={part} />
         ))}
       </div>
     );
   }
   ```

3. **No need for defensive coding**: All properties are initialized (empty string for text, empty array for collections)
   ```javascript
   // This is fine! No need for "|| []"
   const images = content.main.images;
   ```

## Advanced: Type-Based Access

For specialized components that need to work with specific element types:

```javascript
function Gallery({ content }) {
  // Get all images from anywhere in the content
  const allImages = content.byType.image || [];

  return (
    <div className="gallery">
      {allImages.map((img, i) => (
        <img key={i} src={img.src} alt={img.alt} />
      ))}
    </div>
  );
}
```

This approach lets you focus on specific content elements regardless of which part they're in.
