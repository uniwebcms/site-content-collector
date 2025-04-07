import path from "path";

export class VirtualEntryPlugin {
  constructor(virtualPath, moduleCode) {
    this.virtualPath = path.resolve(virtualPath);
    this.moduleCode = moduleCode;
    this.moduleBuffer = Buffer.from(moduleCode, "utf-8");
  }

  apply(compiler) {
    const pluginName = "VirtualEntryPlugin";

    // Mark the file as "present" in Webpack's file system
    compiler.hooks.afterEnvironment.tap(pluginName, () => {
      // Inject virtual file into inputFileSystem
      const fs = compiler.inputFileSystem;

      // Optional: ensure `statSync`, `readFileSync`, etc. are overridden
      const originalReadFile = fs.readFile.bind(fs);
      fs.readFile = (filePath, callback) => {
        if (path.resolve(filePath) === this.virtualPath) {
          return callback(null, this.moduleBuffer);
        }
        return originalReadFile(filePath, callback);
      };

      // Same for sync version (required for some Webpack internals)
      const originalReadFileSync = fs.readFileSync.bind(fs);
      fs.readFileSync = (filePath) => {
        if (path.resolve(filePath) === this.virtualPath) {
          return this.moduleBuffer;
        }
        return originalReadFileSync(filePath);
      };

      const originalStat = fs.stat.bind(fs);
      fs.stat = (filePath, callback) => {
        if (path.resolve(filePath) === this.virtualPath) {
          return callback(null, {
            isFile: () => true,
            isDirectory: () => false,
            mtime: new Date(),
            size: this.moduleBuffer.length,
          });
        }
        return originalStat(filePath, callback);
      };

      const originalStatSync = fs.statSync.bind(fs);
      fs.statSync = (filePath) => {
        if (path.resolve(filePath) === this.virtualPath) {
          return {
            isFile: () => true,
            isDirectory: () => false,
            mtime: new Date(),
            size: this.moduleBuffer.length,
          };
        }
        return originalStatSync(filePath);
      };
    });

    // Make Webpack recognize this module as a dependency so it won't warn
    compiler.hooks.normalModuleFactory.tap(pluginName, (nmf) => {
      nmf.hooks.beforeResolve.tap(pluginName, (data) => {
        if (data.request === this.virtualPath) {
          data.dependencies = []; // no deps, static module
        }
      });
    });

    // Hook file system info (important for caching)
    // compiler.hooks.compilation.tap(pluginName, (compilation) => {
    //   const fileSystemInfo = compilation.fileSystemInfo;
    //   fileSystemInfo._statStorage.set(this.virtualPath, {
    //     isFile: () => true,
    //     isDirectory: () => false,
    //     mtime: new Date(),
    //     size: this.moduleBuffer.length,
    //   });
    // });
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
