// src/webpack/plugin.js
import { collectSiteContent } from "../index.js";
import { resolve } from "path";
import { watch } from "fs";
class SiteContentPlugin {
  constructor(options = {}) {
    this.sourcePath = "./";
    this.contentPath = "pages";
    this.injectToHtml = options.injectToHtml ?? false;
    this.variableName = options.variableName ?? "__SITE_CONTENT__";
    this.filename = options.filename ?? "site-content.json";
    this.injectFormat = options.injectFormat ?? "json"; // 'script' or 'json'
    this.plugins = options.plugins; // custom user plugins
    this.watching = false;
  }

  getInjectionContent() {
    if (this.injectFormat === "json") {
      return `<script type="application/json" id="${
        this.variableName
      }">${JSON.stringify(this.siteContent)}</script>\n`;
    }

    // Default script format
    return `<script>window.${this.variableName} = ${JSON.stringify(
      this.siteContent
    )};</script>`;
  }

  apply(compiler) {
    const pluginName = "SiteContentPlugin";

    // Collect content before compilation
    compiler.hooks.beforeCompile.tapAsync(
      pluginName,
      async (params, callback) => {
        try {
          const sourcePath = resolve(compiler.context, this.sourcePath);
          const options = { plugins: this.plugins };
          this.siteContent = await collectSiteContent(sourcePath, options);
          callback();
        } catch (err) {
          callback(err);
        }
      }
    );

    // Register the HTML modification hook
    if (this.injectToHtml) {
      compiler.hooks.compilation.tap(pluginName, (compilation) => {
        // Find HtmlWebpackPlugin instance
        const hooks = compiler.options.plugins
          .find((plugin) => plugin.constructor.name === "HtmlWebpackPlugin")
          ?.constructor.getHooks(compilation);

        if (hooks) {
          hooks.beforeEmit.tapAsync(pluginName, (data, cb) => {
            const injectionContent = this.getInjectionContent();
            data.html = data.html.replace(
              "</head>",
              injectionContent + "</head>"
            );
            cb(null, data);
          });
        } else {
          console.warn(
            "[SiteContentPlugin] HtmlWebpackPlugin not found - HTML injection disabled"
          );
        }
      });
    }

    // Add JSON file
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          assets[this.filename] = {
            source: () => JSON.stringify(this.siteContent, null, 2),
            size: () => JSON.stringify(this.siteContent).length,
          };
        }
      );
    });

    // Watch mode setup
    if (compiler.options.mode === "development") {
      compiler.hooks.afterEnvironment.tap(pluginName, () => {
        if (!this.watching) {
          this.watching = true;
          // We may have to watch the public folder too
          const watchPath = resolve(
            compiler.context,
            this.sourcePath,
            this.contentPath
          );
          watch(watchPath, { recursive: true }, () => {
            if (compiler.watching) {
              compiler.watching.invalidate();
            }
          });
        }
      });
    }
  }
}

export { SiteContentPlugin };
