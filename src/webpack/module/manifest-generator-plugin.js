import path from "path";
import webpack from "webpack";
import fs from "fs";

export default class ManifestGeneratorPlugin {
  constructor(options = {}) {
    this.options = {
      filename: "manifest.json",
      srcDir: undefined, // Path to the project being built
      ...options,
    };
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      "ManifestGeneratorPlugin",
      (compilation) => {
        compilation.hooks.processAssets.tapAsync(
          {
            name: "ManifestGeneratorPlugin",
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
          },
          (assets, callback) => {
            let version = "unknown";

            if (this.options.srcDir) {
              const projectPath = path.resolve(
                compiler.context,
                this.options.srcDir
              );
              const packageJsonPath = path.join(projectPath, "package.json");
              try {
                const packageJson = JSON.parse(
                  fs.readFileSync(packageJsonPath, "utf8")
                );
                version = packageJson.version;
              } catch (error) {
                compilation.warnings.push(
                  new Error(
                    `ManifestGeneratorPlugin: Error reading ${packageJsonPath}: ${error.message}`
                  )
                );
              }
            }

            const manifest = {
              version,
              generatedAt: new Date().toISOString(),
              files: [],
            };

            for (const filename in compilation.assets) {
              if (filename !== this.options.filename) {
                const file = compilation.assets[filename];
                manifest.files.push({
                  name: filename,
                  size: file.size(),
                  hash: compilation.hash,
                });
              }
            }

            const manifestContent = JSON.stringify(manifest, null, 2);
            compilation.emitAsset(
              this.options.filename,
              new webpack.sources.RawSource(manifestContent)
            );

            callback();
          }
        );
      }
    );
  }
}
