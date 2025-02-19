import path from "path";
import fs from "fs";
import yaml from "js-yaml";

function generateModuleExports(srcDir, moduleName) {
  const componentsDir = path.join(srcDir, moduleName, "components");
  const outputFile = path.join(srcDir, moduleName, "dynamicExports.js");
  const exportedComponents = [];

  // Read all component directories
  const componentDirs = fs.readdirSync(componentsDir);

  componentDirs.forEach((componentDir) => {
    const absDir = path.join(componentsDir, componentDir);
    const indexPath = path.join(absDir, "index.js");
    const configPath = path.join(absDir, "meta", "config.yml");

    if (fs.existsSync(indexPath) && fs.existsSync(configPath)) {
      try {
        const config = yaml.load(fs.readFileSync(configPath, "utf8"));
        if (config && config.export !== false) {
          exportedComponents.push(componentDir);
        }
      } catch (error) {
        console.error(`Error processing config for ${componentDir}:`, error);
      }
    }
  });

  // Generate the content for dynamicExports.js
  let newContent = `// WARNING: This file is auto-generated. DO NOT EDIT MANUALLY.\n`;

  // Generate the content for dynamicExports.js
  newContent += exportedComponents
    .map(
      (component) =>
        `export { default as ${component} } from './components/${component}';`
    )
    .join("\n");

  // Check if the file exists and read its content
  const oldContent = fs.existsSync(outputFile)
    ? fs.readFileSync(outputFile, "utf8")
    : "";

  // Write the content to the output file
  if (newContent !== oldContent) {
    fs.writeFileSync(outputFile, newContent);
    const relPath = path.relative(srcDir, outputFile);
    console.log(
      `Generated ${relPath} with ${exportedComponents.length} exported components.`
    );
  }
}

export default function generateExports(srcDir, moduleDir = null) {
  if (moduleDir) {
    generateModuleExports(srcDir, moduleDir);
  } else {
    // Read all module directories
    fs.readdirSync(srcDir).forEach((moduleDir) => {
      generateModuleExports(srcDir, moduleDir);
    });
  }
}
