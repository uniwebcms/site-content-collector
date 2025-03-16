// extract-tools.js
import fs from "fs";
import path from "path";
import ts from "typescript";

const TOOLS_DIR = path.resolve("src/tools");
const METADATA_FILE = path.join(TOOLS_DIR, "tools-metadata.json");
const INDEX_FILE = path.join(TOOLS_DIR, "index.js");

// Ensure output directory exists
if (!fs.existsSync(TOOLS_DIR)) {
  fs.mkdirSync(TOOLS_DIR, { recursive: true });
}

const toolRegistry = [];
const toolExports = [];

const files = fs
  .readdirSync(TOOLS_DIR)
  .filter((file) => file.endsWith(".js") && file !== "index.js");

for (const file of files) {
  const moduleName = file.replace(".js", "");
  const filePath = path.join(TOOLS_DIR, file);
  const sourceCode = fs.readFileSync(filePath, "utf8");

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  function cleanType(typeStr) {
    if (!typeStr) return "any";

    // Remove curly braces but preserve other important syntax
    let cleaned = typeStr.replace(/[{}]/g, "");

    // Handle union types by normalizing spaces around pipe (|)
    cleaned = cleaned
      .replace(/\s*\|\s*/g, "|") // Normalize space around union type separator
      .replace(/\(\s*(.*?)\s*\)/g, "$1") // Remove unnecessary parentheses
      .replace(/\s+/g, " ") // Convert multiple spaces to single space
      .trim(); // Remove leading/trailing spaces

    return cleaned;
  }

  function cleanDescription(desc) {
    return desc ? desc.replace(/^- /, "").trim() : ""; // Remove leading "- "
  }

  function extractDefaultValueFromSignature(node, paramName) {
    if (!node || !node.parameters) return undefined;

    for (const param of node.parameters) {
      if (
        param.name &&
        param.name.getText() === paramName &&
        param.initializer
      ) {
        return param.initializer.getText().replace(/^["']|["']$/g, ""); // Remove surrounding quotes if string
      }
    }
    return undefined;
  }

  function extractDefaultValueFromJSDoc(tag, paramName) {
    if (!tag) return undefined;

    const tagText = tag.getFullText();

    // Escape special regex characters in paramName
    const escapedParamName = paramName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // More comprehensive regex pattern to handle various whitespace scenarios
    // This matches [paramName=value] or [paramName = value] with any amount of whitespace
    const defaultValueRegex = new RegExp(
      `\\[\\s*${escapedParamName}\\s*=\\s*([^\\]]+?)\\s*\\]`
    );
    const match = tagText.match(defaultValueRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    return undefined; // No default value found
  }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;

      // Extract JSDoc
      const jsdoc = ts.getJSDocCommentsAndTags(node);
      let description = "";
      const params = [];
      let examples = [];

      for (const comment of jsdoc) {
        if (ts.isJSDoc(comment)) {
          description = comment.comment
            ? cleanDescription(comment.comment)
            : "";

          // Extract tags
          for (const tag of comment.tags || []) {
            if (ts.isJSDocParameterTag(tag) && tag.name) {
              const paramName = tag.name.getText(); // TypeScript already removes brackets
              const paramType = cleanType(
                tag.typeExpression ? tag.typeExpression.getText() : "any"
              );
              let paramDesc = cleanDescription(
                tag.comment ? tag.comment.trim() : ""
              );
              const isOptional = tag.isBracketed; // Directly check if TypeScript marked it optional

              // Try to extract default value from JSDoc
              let defaultValue = isOptional
                ? extractDefaultValueFromJSDoc(tag, paramName)
                : undefined;

              // If no default value in JSDoc, check function signature
              if (defaultValue === undefined) {
                defaultValue = extractDefaultValueFromSignature(
                  node,
                  paramName
                );
              }

              params.push({
                name: paramName,
                type: paramType,
                description: paramDesc,
                optional: isOptional || defaultValue !== undefined, // Mark optional if a default exists
                defaultValue,
              });
            } else if (ts.isJSDocTag(tag) && tag.tagName.text === "example") {
              examples.push(tag.comment ? tag.comment.trim() : "");
            }
          }
        }
      }

      toolRegistry.push({
        module: moduleName,
        name: functionName,
        description,
        params,
        examples,
      });

      toolExports.push(`export { ${functionName} } from "./${moduleName}.js";`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

// Write metadata JSON
fs.writeFileSync(METADATA_FILE, JSON.stringify(toolRegistry, null, 2));

// Write index.js file to export all tools
fs.writeFileSync(INDEX_FILE, toolExports.join("\n"));

console.log("✅ Tools extracted with correct optional & default values!");
