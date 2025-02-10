// src/webpack/plugin.js
const { collectSiteContent } = require("../index");
const { resolve } = require("path");
const { watch } = require("fs");

class SiteContentPlugin {
  constructor(options = {}) {
    this.sourcePath = options.sourcePath;
    if (!this.sourcePath) {
      throw new Error("SiteContentPlugin requires a sourcePath option");
    }

    this.injectToHtml = options.injectToHtml ?? false;
    this.variableName = options.variableName ?? "__SITE_CONTENT__";
    this.filename = options.filename ?? "site-content.json";
    this.watching = false;
  }

  apply(compiler) {
    const pluginName = "SiteContentPlugin";

    // Collect content before compilation
    compiler.hooks.beforeCompile.tapAsync(
      pluginName,
      async (params, callback) => {
        try {
          const sourcePath = resolve(compiler.context, this.sourcePath);
          this.siteContent = await collectSiteContent(sourcePath);
          callback();
        } catch (err) {
          callback(err);
        }
      }
    );

    // Register the HTML modification hook
    if (this.injectToHtml) {
      compiler.hooks.compilation.tap(pluginName, (compilation) => {
        // Ensure we have access to the html-webpack-plugin hooks
        const hooks = compiler.options.plugins
          .find((plugin) => plugin.constructor.name === "HtmlWebpackPlugin")
          ?.constructor.getHooks(compilation);

        if (hooks) {
          console.log("[SiteContentPlugin] Found HtmlWebpackPlugin hooks");
          hooks.beforeEmit.tapAsync(pluginName, (data, cb) => {
            console.log("[SiteContentPlugin] Injecting into HTML");
            const script = `<script>window.${
              this.variableName
            } = ${JSON.stringify(this.siteContent)};</script>`;
            data.html = data.html.replace("</head>", script + "</head>");
            cb(null, data);
          });
        } else {
          console.warn("[SiteContentPlugin] HtmlWebpackPlugin hooks not found");
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
          const sourcePath = resolve(compiler.context, this.sourcePath);
          watch(sourcePath, { recursive: true }, () => {
            if (compiler.watching) {
              compiler.watching.invalidate();
            }
          });
        }
      });
    }
  }
}

module.exports = SiteContentPlugin;
