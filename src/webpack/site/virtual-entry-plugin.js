import path from "path";

// Static registry to track all virtual files across plugin instances
const virtualFiles = new Map();

export default class VirtualEntryPlugin {
  constructor(virtualPath, moduleCode) {
    this.virtualPath = path.resolve(virtualPath);
    this.moduleCode = moduleCode;
    this.moduleBuffer = Buffer.from(moduleCode, "utf-8");

    // Register this virtual file in the global registry
    virtualFiles.set(this.virtualPath, {
      code: this.moduleCode,
      buffer: this.moduleBuffer,
    });
  }

  apply(compiler) {
    const pluginName = "VirtualEntryPlugin";

    // Patch the filesystem to handle entry point resolution
    compiler.hooks.beforeRun.tap(pluginName, () => {
      this._ensureFileSystemPatched(compiler.inputFileSystem);
    });

    compiler.hooks.watchRun.tap(pluginName, () => {
      this._ensureFileSystemPatched(compiler.inputFileSystem);
    });

    // Register for proper rebuilds in watch mode
    compiler.hooks.afterCompile.tap(pluginName, (compilation) => {
      // Add all virtual files to dependencies
      for (const virtualPath of virtualFiles.keys()) {
        compilation.fileDependencies.add(virtualPath);
      }
    });
  }

  /**
   * Helper method to patch the filesystem
   * This is necessary for entry points specifically because
   * general approaches don't kick in so early in the process
   */
  _ensureFileSystemPatched(fs) {
    // Only patch once per filesystem
    if (fs._virtualEntryPluginPatched) return;
    fs._virtualEntryPluginPatched = true;

    // Store original methods
    const originalResolve = fs.statSync;
    const originalReadFile = fs.readFileSync;

    // Override stat method to handle all virtual files
    fs.statSync = function (filePath) {
      const normalizedPath = path.normalize(filePath);
      const virtualFile = getVirtualFile(normalizedPath);

      if (virtualFile) {
        return {
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          size: virtualFile.buffer.length,
        };
      }

      return originalResolve.apply(this, arguments);
    };

    // Override readFile method to handle all virtual files
    fs.readFileSync = function (filePath, options) {
      const normalizedPath = path.normalize(filePath);
      const virtualFile = getVirtualFile(normalizedPath);

      if (virtualFile) {
        return options && options.encoding
          ? virtualFile.code
          : virtualFile.buffer;
      }

      return originalReadFile.apply(this, arguments);
    };

    // Handle async versions if they exist
    if (typeof fs.stat === "function") {
      const originalStatAsync = fs.stat;

      fs.stat = function (filePath, callback) {
        const normalizedPath = path.normalize(filePath);
        const virtualFile = getVirtualFile(normalizedPath);

        if (virtualFile) {
          const stat = {
            isFile: () => true,
            isDirectory: () => false,
            mtime: new Date(),
            size: virtualFile.buffer.length,
          };

          process.nextTick(() => callback(null, stat));
          return;
        }

        return originalStatAsync.apply(this, arguments);
      };
    }

    if (typeof fs.readFile === "function") {
      const originalReadFileAsync = fs.readFile;

      fs.readFile = function (filePath, optionsOrCallback, maybeCallback) {
        const callback =
          typeof optionsOrCallback === "function"
            ? optionsOrCallback
            : maybeCallback;
        const options =
          typeof optionsOrCallback === "function" ? null : optionsOrCallback;
        const normalizedPath = path.normalize(filePath);
        const virtualFile = getVirtualFile(normalizedPath);

        if (virtualFile) {
          const content =
            options && options.encoding ? virtualFile.code : virtualFile.buffer;
          process.nextTick(() => callback(null, content));
          return;
        }

        return originalReadFileAsync.apply(this, arguments);
      };
    }
  }
}

// Helper function to find a virtual file by path
function getVirtualFile(normalizedPath) {
  for (const [virtualPath, fileData] of virtualFiles.entries()) {
    if (path.normalize(virtualPath) === normalizedPath) {
      return fileData;
    }
  }
  return null;
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
