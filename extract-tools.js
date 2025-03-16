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
    return typeStr.replace(/[{}?]/g, "").trim(); // Remove `{}`, `?`
  }

  function cleanDescription(desc) {
    return desc ? desc.replace(/^- /, "").trim() : ""; // Remove leading "- "
  }

  function extractDefaultValueFromSignature(node, paramName) {
    for (const param of node.parameters) {
      if (param.name.getText() === paramName && param.initializer) {
        return param.initializer.getText().replace(/^["']|["']$/g, ""); // Remove surrounding quotes if string
      }
    }
    return null;
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
            if (ts.isJSDocParameterTag(tag)) {
              const paramName = tag.name.getText(); // TypeScript already removes brackets
              const paramType = cleanType(
                tag.typeExpression ? tag.typeExpression.getText() : "any"
              );
              let paramDesc = cleanDescription(
                tag.comment ? tag.comment.trim() : ""
              );
              const isOptional = tag.isBracketed; // Directly check if TypeScript marked it optional

              // If TypeScript parsed a default value, use it.
              let defaultValue = tag.typeExpression?.default
                ? tag.typeExpression.default.getText()
                : null;

              // If TypeScript didn't extract the default, check the function signature.
              if (!defaultValue) {
                defaultValue = extractDefaultValueFromSignature(
                  node,
                  paramName
                );
              }

              params.push({
                name: paramName,
                type: paramType,
                description: paramDesc,
                optional: isOptional || !!defaultValue, // Mark optional if a default exists
                defaultValue: defaultValue,
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
