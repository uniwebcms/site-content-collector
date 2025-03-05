# Uniweb Content Parsing Reference

This document explains how Uniweb parses markdown content and the different ways components can access it. Uniweb provides multiple ways to access the same content, allowing developers to choose the approach that best fits their component's needs.

## Content Structure Overview

When Uniweb parses a markdown file, it produces a structured content object with multiple access patterns:

```javascript
content = {
  // High-level access patterns
  main: {
    /* properties for the first part */
  },
  subs: [
    /* array of properties for subsequent parts */
  ],

  // Mid-level access pattern
  parts: [
    /* array of all parts (main + subs) */
  ],

  // Low-level access patterns
  elements: [
    /* array of all content elements in order */
  ],
  byType: {
    /* map of element types to arrays of elements */
  },
};
```

Each access pattern provides a different level of abstraction, from high-level (main/subs) to low-level (elements).

## High-Level Access: `main` and `subs`

The most common way to access content is through the `main` and `subs` properties:

- **main**: Contains the properties of the first content part
- **subs**: Array of properties for all other parts

```javascript
function MyComponent({ content }) {
  const { main, subs } = content;

  return (
    <div>
      <h1>{main.title}</h1>
      <p>{main.text}</p>

      {subs.map((sub) => (
        <div key={sub.title}>
          <h2>{sub.title}</h2>
          <p>{sub.text}</p>
        </div>
      ))}
    </div>
  );
}
```

## Mid-Level Access: `parts`

For components that want to treat all parts equally, the `parts` property provides an array of all parts:

```javascript
function MyComponent({ content }) {
  return (
    <div>
      {content.parts.map((part, index) => (
        <div key={index}>
          <h2>{part.title}</h2>
          <p>{part.text}</p>
        </div>
      ))}
    </div>
  );
}
```

The relationship between these properties is:

- `content.main` equals `content.parts[0]`
- `content.subs` equals `content.parts.slice(1)`

## Low-Level Access: `elements` and `byType`

For components that need more granular control, Uniweb provides:

- **elements**: Array of all content elements in document order
- **byType**: Map of element types to arrays of elements

```javascript
function MyComponent({ content }) {
  // Access all paragraphs regardless of which part they're in
  const allParagraphs = content.byType.paragraph || [];

  // Access all images
  const allImages = content.byType.image || [];

  return (
    <div>
      {allParagraphs.map((p, index) => (
        <p key={index}>{p.text}</p>
      ))}

      <div className="gallery">
        {allImages.map((img, index) => (
          <img key={index} src={img.src} alt={img.alt} />
        ))}
      </div>
    </div>
  );
}
```

## Common Properties Within Parts

Each part (whether `main` or an item in `subs`) can contain the following properties:

| Property     | Type   | Description                                       |
| ------------ | ------ | ------------------------------------------------- |
| `title`      | String | The heading text of the part                      |
| `text`       | String | Concatenated text from all consecutive paragraphs |
| `paragraphs` | Array  | Individual paragraphs as separate elements        |
| `list`       | Array  | Items from any lists in the part                  |
| `images`     | Array  | Image objects with `src` and `alt` properties     |
| `links`      | Array  | Link objects with `href` and `text` properties    |
| `tables`     | Array  | Table objects parsed from markdown tables         |
| `code`       | Array  | Code blocks with `language` and `content`         |

All properties are initialized to reasonable defaults (empty strings for text, empty arrays for collections), so components don't need defensive coding.

## Example: Parsing Process

Given this markdown:

```markdown
# Main Title

First paragraph in main.
Second paragraph in main.

- List item 1
- List item 2

![Image](./image.jpg)

## Sub Section 1

Content for first sub.

## Sub Section 2

Content for second sub.

- Sub list item 1
- Sub list item 2
```

Uniweb would parse it into:

```javascript
{
  main: {
    title: "Main Title",
    text: "First paragraph in main. Second paragraph in main.",
    paragraphs: [
      "First paragraph in main.",
      "Second paragraph in main."
    ],
    list: ["List item 1", "List item 2"],
    images: [{ alt: "Image", src: "./image.jpg" }],
    links: [],
    tables: [],
    code: []
  },
  subs: [
    {
      title: "Sub Section 1",
      text: "Content for first sub.",
      paragraphs: ["Content for first sub."],
      list: [],
      images: [],
      links: [],
      tables: [],
      code: []
    },
    {
      title: "Sub Section 2",
      text: "Content for second sub.",
      paragraphs: ["Content for second sub."],
      list: ["Sub list item 1", "Sub list item 2"],
      images: [],
      links: [],
      tables: [],
      code: []
    }
  ],
  parts: [/* contains main and subs combined */],
  elements: [/* all raw elements */],
  byType: {
    heading: [/* all headings */],
    paragraph: [/* all paragraphs */],
    list: [/* all lists */],
    image: [/* all images */],
    /* other types... */
  }
}
```

## Best Practices

1. **Start with the highest level of abstraction**: Use `main` and `subs` unless you need more control.

2. **Use `parts` when treating all content equally**: Good for components that render a series of similar sections.

3. **Use `byType` for specialized components**: For galleries, tables of contents, or other element-specific components.

4. **Avoid direct element access**: Only use `elements` when the other access patterns don't provide what you need.

5. **Remember defaults are provided**: No need for `|| []` or `|| ""` in your component code.

## Advanced: Custom Parsing

Uniweb allows components to apply custom parsing logic by providing transformation functions:

```javascript
function MyComponent({ content, transform }) {
  // Apply custom transformations
  const processedContent = transform(content, {
    // Define custom transformations
    combineLists: true,
    flattenStructure: true,
  });

  return <div>{/* render with processedContent */}</div>;
}
```

For more information on custom transformations, see the advanced component documentation.
