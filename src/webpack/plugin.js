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

    // Add content to compilation assets
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      if (this.injectToHtml) {
        // Hook into HTML plugin if available
        const hooks = compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing;
        if (hooks) {
          hooks.tapAsync(pluginName, (data, cb) => {
            const script = `<script>window.${
              this.variableName
            } = ${JSON.stringify(this.siteContent)}</script>`;
            data.html = data.html.replace("</head>", script + "</head>");
            cb(null, data);
          });
        }
      } else {
        // Output as JSON file
        compilation.assets[this.filename] = {
          source: () => JSON.stringify(this.siteContent, null, 2),
          size: () => JSON.stringify(this.siteContent).length,
        };
      }
      callback();
    });

    // Watch mode setup
    if (compiler.options.mode === "development") {
      compiler.hooks.afterEnvironment.tap(pluginName, () => {
        if (!this.watching) {
          this.watching = true;
          const sourcePath = resolve(compiler.context, this.sourcePath);

          watch(sourcePath, { recursive: true }, (eventType, filename) => {
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
