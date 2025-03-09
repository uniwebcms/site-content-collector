import fs from "fs";
import path from "path";
import ts from "typescript";

const COMPONENTS_DIR = path.resolve("components");
const OUTPUT_FILE = path.resolve("params-metadata.json");

/**
 * Recursively find all `params.ts` files inside `components/[**]/meta/`
 */
function findParamsFiles(dir) {
  let results = [];

  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(findParamsFiles(fullPath));
    } else if (entry.isFile() && entry.name === "params.ts") {
      results.push(fullPath);
    }
  });

  return results;
}

/**
 * Extract JSDoc comments and return the best description.
 */
function getJSDoc(node) {
  const rawComment = ts.getJSDocCommentsAndTags(node)[0]?.comment || "";
  const rawTags = ts.getJSDocTags(node);

  let description = "";
  let defaultValue = null;

  // Extract `@tags` into a map
  const tags = rawTags.reduce((acc, tag) => {
    const name = tag.tagName.text;
    const text = tag.comment || "";
    acc[name] = text;
    return acc;
  }, {});

  // Prefer @description if explicitly given
  if (tags["description"]) {
    description = tags["description"];
  } else {
    // Otherwise, use the main comment text (until first @tag)
    const splitComment = rawComment.split(/@\w+/);
    description = splitComment[0].trim();
  }

  // Extract default value
  if (tags["default"]) {
    defaultValue = tags["default"];
  }

  return { description, default: defaultValue };
}

function getTypeFromText(typeNode) {
  const typeName = typeNode.getFullText().trim();

  if (typeName.includes("|")) {
    const options = typeName
      .split("|")
      .map((item) => item.trim().replace(/^['"`]|['"`]$/g, ""));

    return { name: "union", options };
  }

  return { name: typeName };
}

/**
 * Resolve a referenced type (e.g., `ButtonSize` → `"small" | "medium" | "large"`).
 */
function resolveType(typeChecker, typeNode) {
  if (!ts.isTypeReferenceNode(typeNode)) {
    return getTypeFromText(typeNode);
  }

  const symbol = typeChecker.getSymbolAtLocation(typeNode.typeName);
  if (!symbol || !symbol.declarations.length)
    return { name: typeNode.getFullText().trim() };

  const declaration = symbol.declarations[0];

  // Handle `type X = "a" | "b" | "c"`
  if (
    ts.isTypeAliasDeclaration(declaration) &&
    ts.isUnionTypeNode(declaration.type)
  ) {
    const options = declaration.type.types
      .filter(ts.isLiteralTypeNode)
      .map((literal) => literal.getText().replace(/['"`]/g, ""));

    return { name: "union", options };
    // return declaration.type.types
    //   .filter(ts.isLiteralTypeNode)
    //   .map((literal) => literal.getText().replace(/['"]/g, ""))
    //   .join(" | ");
  }

  // Handle `enum X { A = "a", B = "b" }`
  if (ts.isEnumDeclaration(declaration)) {
    const options = declaration.members
      .map((member) => member.name)
      .filter((name) => ts.isIdentifier(name) || ts.isStringLiteral(name))
      .map((name) => name.getText().replace(/['"`]/g, ""));

    return { name: "enum", options };

    // return declaration.members
    //   .map((member) => member.name)
    //   .filter((name) => ts.isIdentifier(name) || ts.isStringLiteral(name))
    //   .map((name) => name.getText().replace(/['"]/g, ""))
    //   .join(" | ");
  }

  return getTypeFromText(typeNode);
}

/**
 * Extract metadata from the `params` property.
 * @see https://typestrong.org/typedoc-auto-docs/typedoc/modules/TypeScript.html#isInterfaceDeclaration
 */
function extractParamsFromFile(filePath, program) {
  const sourceFile = program.getSourceFile(filePath);
  const typeChecker = program.getTypeChecker();
  if (!sourceFile) return null;

  const componentParams = [];

  function visit(node) {
    // if (ts.isPropertySignature(node) && node.type) {
    //   const propName = node.name.escapedText;
    //   const resolvedType = resolveType(typeChecker, node.type);
    //   const propJSDoc = getJSDoc(node);
    //   const paramInfo = {
    //     name: propName,
    //     type: resolvedType.name,
    //     options: resolvedType.options,
    //     description: propJSDoc.description,
    //     default: propJSDoc.default,
    //     optional: !!node.questionToken,
    //   };

    //   componentParams.push(paramInfo);
    // }

    // Only process the interface named "Params"
    if (ts.isInterfaceDeclaration(node) && node.name.text === "Params") {
      node.members.forEach((member) => {
        if (ts.isPropertySignature(member) && member.type) {
          const propName = member.name.escapedText;
          const resolvedType = resolveType(typeChecker, member.type);
          const propJSDoc = getJSDoc(member);

          const paramInfo = {
            name: propName,
            type: resolvedType.name,
            options: resolvedType.options,
            description: propJSDoc.description,
            default: propJSDoc.default,
            optional: !!member.questionToken,
          };

          // console.log("paramInfo", paramInfo);
          componentParams.push(paramInfo);
        }
      });

      return; // Stop visiting other nodes once "Params" is found
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  return { filePath, componentParams };
}

/**
 * Process all valid `params.ts` files and extract metadata.
 */
export default function extractAllParams(srcDir) {
  const paramFiles = findParamsFiles(srcDir);
  console.log("FILES", paramFiles);
  if (paramFiles.length === 0) {
    console.log("⚠️ No `params.ts` files found. Skipping extraction.");
    return;
  }

  const program = ts.createProgram(paramFiles, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
  });

  return paramFiles
    .map((file) => extractParamsFromFile(file, program))
    .filter(Boolean)
    .flat();

  // fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));

  // console.log(`✅ Params metadata saved to ${OUTPUT_FILE}`);
}

// Run the script
// extractAllParams();
