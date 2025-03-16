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
    return typeStr.replace(/[{}]/g, "").trim(); // Remove curly braces
  }

  function cleanDescription(desc) {
    return desc ? desc.replace(/^- /, "").trim() : ""; // Remove leading "- "
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
              const paramName = tag.name.getText();
              const paramType = tag.typeExpression
                ? cleanType(tag.typeExpression.getText())
                : "any";
              const paramDesc = cleanDescription(
                tag.comment ? tag.comment.trim() : ""
              );
              const isOptional = tag.isBracketed;
              const defaultValue =
                tag.comment && tag.comment.includes("Default: ")
                  ? tag.comment.split("Default: ")[1].split(/\s+/)[0]
                  : null;

              params.push({
                name: paramName,
                type: paramType,
                description: paramDesc,
                optional: isOptional,
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

console.log("✅ Tools extracted and cleaned successfully!");
