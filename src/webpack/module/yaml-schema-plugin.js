import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import webpack from "webpack";
import imageSize from "image-size";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname } from "path";
import extractParams from "./extractParams.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadYaml(fullPath) {
  // Read YAML file and convert YAML content to JS object
  return yaml.load(fs.readFileSync(fullPath, "utf8"));
}

export default class YamlSchemaPlugin {
  constructor(options = {}) {
    this.options = {
      srcDir: "src",
      output: "schema.json",
      ...options,
    };

    this.autoSchema = loadYaml(__dirname + "/auto_schema.yml");
  }

  apply(compiler) {
    const logger = compiler.getInfrastructureLogger("YamlSchemaPlugin");

    // Exclude PNG files from performance hints
    if (
      compiler.options.performance &&
      compiler.options.performance.assetFilter
    ) {
      const originalAssetFilter = compiler.options.performance.assetFilter;
      compiler.options.performance.assetFilter = (assetFilename) => {
        if (assetFilename.endsWith(".png")) return false;
        return originalAssetFilter(assetFilename);
      };
    } else if (compiler.options.performance) {
      compiler.options.performance.assetFilter = (assetFilename) =>
        !assetFilename.endsWith(".png");
    }

    compiler.hooks.thisCompilation.tap("YamlSchemaPlugin", (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: "YamlSchemaPlugin",
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async (assets, callback) => {
          const schema = { _self: {} };
          const srcDir = path.resolve(compiler.context, this.options.srcDir);
          const isProduction =
            compilation.compiler.options.mode === "production";

          try {
            this.processModuleConfig(srcDir, schema);
            await this.processComponentConfigs(
              srcDir,
              schema,
              compilation,
              isProduction
            );
            this.emitSchema(compilation, schema);
            await this.handleAssets(compilation, srcDir, schema, isProduction);
          } catch (err) {
            compilation.errors.push(
              new Error(`YamlSchemaPlugin error: ${err.message}`)
            );
          }

          callback();
        }
      );
    });
  }

  processModuleConfig(srcDir, schema) {
    const moduleConfigPath = path.join(srcDir, "config.yml");
    if (fs.existsSync(moduleConfigPath)) {
      const moduleConfig = yaml.load(fs.readFileSync(moduleConfigPath, "utf8"));
      schema._self = moduleConfig;
    }
  }

  async processComponentConfigs(srcDir, schema, compilation, isProduction) {
    //
    const params = extractParams(path.join(srcDir, "components"));
    console.log("PARAMS:", params);
    //

    const componentDirs = fs.readdirSync(path.join(srcDir, "components"));
    for (const componentDir of componentDirs) {
      const configPath = path.join(
        srcDir,
        "components",
        componentDir,
        "meta",
        "config.yml"
      );
      if (fs.existsSync(configPath)) {
        const config = yaml.load(fs.readFileSync(configPath, "utf8"));
        if (config && config.export !== false) {
          schema[componentDir] = await this.processComponentConfig(
            config,
            componentDir,
            srcDir,
            compilation,
            isProduction
          );
        }
      }
    }
  }

  async processComponentConfig(
    config,
    componentDir,
    srcDir,
    compilation,
    isProduction
  ) {
    const processedConfig = { ...config, name: componentDir };

    if (config.presets) {
      processedConfig.presets = await Promise.all(
        Object.entries(config.presets).map(async ([presetName, preset]) => {
          const imagePath = path.join(
            srcDir,
            "components",
            componentDir,
            "meta",
            preset.image || `${presetName}.png`
          );
          let imageInfo = {};
          if (fs.existsSync(imagePath)) {
            const { width, height } = imageSize(imagePath);
            const outputFormat = isProduction ? "webp" : "png";
            const outputFilename = `${presetName}.${outputFormat}`;
            imageInfo = {
              height,
              width,
              type: outputFormat,
              path: `assets/${componentDir}/${outputFilename}`,
            };
            await this.processAndEmitImage(
              compilation,
              imagePath,
              `assets/${componentDir}/${outputFilename}`,
              isProduction
            );
          }
          return { ...preset, image: imageInfo };
        })
      );
    }

    if (config.images) {
      processedConfig.images = await Promise.all(
        config.images.map(async (file) => {
          const imagePath = path.join(
            srcDir,
            "components",
            componentDir,
            "meta",
            file
          );
          let imageInfo = {};
          if (fs.existsSync(imagePath)) {
            const { width, height } = imageSize(imagePath);
            const outputFormat = isProduction ? "webp" : "png";

            imageInfo = {
              height,
              width,
              type: outputFormat,
              path: `assets/${componentDir}/${file}`,
            };
            await this.processAndEmitImage(
              compilation,
              imagePath,
              `assets/${componentDir}/${file}`,
              isProduction
            );
          }
          return imageInfo;
        })
      );
    }

    this.autoCompleteComponent(processedConfig);

    return processedConfig;
  }

  emitSchema(compilation, schema) {
    const schemaJson = JSON.stringify(schema, null, 2);
    compilation.emitAsset(
      this.options.output,
      new webpack.sources.RawSource(schemaJson)
    );
  }

  async handleAssets(compilation, srcDir, schema, isProduction) {
    for (const componentName of Object.keys(schema)) {
      if (componentName !== "_self") {
        const componentDir = path.join(srcDir, "components", componentName);
        const metaDir = path.join(componentDir, "meta");
        if (fs.existsSync(metaDir)) {
          const files = fs.readdirSync(metaDir);
          for (const file of files) {
            if (file.endsWith(".png") || file.endsWith(".jpg")) {
              const sourcePath = path.join(metaDir, file);
              const outputFormat = isProduction
                ? "webp"
                : path.extname(file).slice(1);
              const outputFilename = `${path.basename(
                file,
                path.extname(file)
              )}.${outputFormat}`;
              const destPath = `assets/${componentName}/${outputFilename}`;
              await this.processAndEmitImage(
                compilation,
                sourcePath,
                destPath,
                isProduction
              );
            }
          }
        }
      }
    }
  }

  async processAndEmitImage(compilation, sourcePath, destPath, isProduction) {
    if (isProduction) {
      const webpBuffer = await sharp(sourcePath)
        .webp({ quality: 80 })
        .toBuffer();
      compilation.emitAsset(
        destPath,
        new webpack.sources.RawSource(webpBuffer)
      );
    } else {
      this.createSymlink(compilation, sourcePath, destPath);
    }
  }

  createSymlink(compilation, sourcePath, destPath) {
    const absoluteDestPath = path.join(
      compilation.outputOptions.path,
      destPath
    );
    fs.mkdirSync(path.dirname(absoluteDestPath), { recursive: true });
    if (!fs.existsSync(absoluteDestPath)) {
      fs.symlinkSync(sourcePath, absoluteDestPath);
    }
  }

  autoCompleteComponent(component) {
    let { elements, items } = component;

    if (Array.isArray(elements)) {
      elements = Object.fromEntries(elements.map((key) => [key, null]));
    }

    const autoElements = this.autoSchema.elements || {};

    for (const role in elements) {
      elements[role] ??= {};

      if (autoElements[role]) {
        const element = elements[role];
        const template = autoElements[role];

        for (const key in template) {
          if (!element.hasOwnProperty(key)) {
            element[key] = template[key];
          }
        }
      }
    }

    if (items) {
      this.autoCompleteComponent(items);
    }
  }
}
