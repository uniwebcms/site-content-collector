import path from "path";

export default class VirtualEntryPlugin {
  constructor(virtualPath, moduleCode) {
    this.virtualPath = path.resolve(virtualPath);
    this.moduleCode = moduleCode;
    this.moduleBuffer = Buffer.from(moduleCode, "utf-8");
  }

  apply(compiler) {
    const pluginName = "VirtualEntryPlugin";

    // Patch the filesystem to handle entry point resolution
    // This is necessary for entry points specifically
    compiler.hooks.beforeRun.tap(pluginName, () => {
      this._patchFileSystem(compiler.inputFileSystem);
    });

    compiler.hooks.watchRun.tap(pluginName, () => {
      this._patchFileSystem(compiler.inputFileSystem);
    });

    // Register for proper rebuilds in watch mode
    compiler.hooks.afterCompile.tap(pluginName, (compilation) => {
      compilation.fileDependencies.add(this.virtualPath);
    });
  }

  // Helper method to patch the filesystem
  _patchFileSystem(fs) {
    // Only patch once
    if (fs._virtualEntryPluginPatched) return;
    fs._virtualEntryPluginPatched = true;

    // Store original methods
    const originalResolve = fs.statSync;
    const originalReadFile = fs.readFileSync;

    // Override stat method
    fs.statSync = (filePath) => {
      if (path.normalize(filePath) === path.normalize(this.virtualPath)) {
        return {
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          size: this.moduleBuffer.length,
        };
      }
      return originalResolve.call(fs, filePath);
    };

    // Override readFile method
    fs.readFileSync = (filePath, options) => {
      if (path.normalize(filePath) === path.normalize(this.virtualPath)) {
        return options && options.encoding
          ? this.moduleCode
          : this.moduleBuffer;
      }
      return originalReadFile.call(fs, filePath, options);
    };

    // Handle async versions if they exist
    if (typeof fs.stat === "function") {
      const originalStatAsync = fs.stat;
      fs.stat = (filePath, callback) => {
        if (path.normalize(filePath) === path.normalize(this.virtualPath)) {
          const stat = {
            isFile: () => true,
            isDirectory: () => false,
            mtime: new Date(),
            size: this.moduleBuffer.length,
          };
          process.nextTick(() => callback(null, stat));
          return;
        }
        return originalStatAsync.call(fs, filePath, callback);
      };
    }

    if (typeof fs.readFile === "function") {
      const originalReadFileAsync = fs.readFile;
      fs.readFile = (filePath, optionsOrCallback, maybeCallback) => {
        const callback =
          typeof optionsOrCallback === "function"
            ? optionsOrCallback
            : maybeCallback;
        const options =
          typeof optionsOrCallback === "function" ? null : optionsOrCallback;

        if (path.normalize(filePath) === path.normalize(this.virtualPath)) {
          const content =
            options && options.encoding ? this.moduleCode : this.moduleBuffer;
          process.nextTick(() => callback(null, content));
          return;
        }
        return originalReadFileAsync.call(
          fs,
          filePath,
          optionsOrCallback,
          maybeCallback
        );
      };
    }
  }
}

// Usage in webpack.config.js
/*
import path from 'path';
import { VirtualEntryPlugin } from './src/webpack/VirtualEntryPlugin.js';

const isRemote = process.env.USE_REMOTE === 'true';

const virtualEntryPath = path.resolve('./src/virtual-entry.js');

const entryCode = isRemote
  ? `import { initRTE } from "@uniwebcms/uniweb-rte"; initRTE(import("RemoteModule/widgets"), { development: true });`
  : `import { initRTE } from "@uniwebcms/uniweb-rte"; import widgets from "local-widgets"; initRTE(widgets, { development: true });`;

export default {
  mode: 'development',
  entry: virtualEntryPath,
  output: {
    path: path.resolve('./dist'),
    filename: 'bundle.js',
  },
  resolve: {
    alias: {
      ...(isRemote ? {} : {
        'local-widgets': path.resolve('./packages/widgets/dist/widgets.abc123.js') // Resolve dynamically as needed
      })
    },
  },
  plugins: [
    new VirtualEntryPlugin(virtualEntryPath, entryCode),
    // other plugins...
  ]
};
*/
