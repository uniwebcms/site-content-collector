// tests/core/plugin.test.js
import { jest } from "@jest/globals";
import {
  CollectorPlugin,
  ProcessorPlugin,
  LoaderPlugin,
  PluginRegistry,
} from "../../src/core/plugin.js";

describe("Plugin System", () => {
  describe("PluginRegistry", () => {
    test("registers and retrieves plugins", () => {
      const registry = new PluginRegistry();
      const plugin = new CollectorPlugin();

      registry.register(plugin);
      expect(registry.get(plugin.constructor.name)).toBe(plugin);
    });

    test("handles plugin dependencies correctly", () => {
      const registry = new PluginRegistry();
      const pluginA = new CollectorPlugin();
      const pluginB = new CollectorPlugin();
      const pluginC = new CollectorPlugin();

      // B depends on A, C depends on B
      registry
        .register(pluginC, ["PluginB"])
        .register(pluginB, ["PluginA"])
        .register(pluginA);

      const orderedPlugins = registry.getOrderedPlugins();
      const names = orderedPlugins.map((p) => p.constructor.name);

      // Check that dependencies come before dependents
      expect(names.indexOf("PluginA")).toBeLessThan(names.indexOf("PluginB"));
      expect(names.indexOf("PluginB")).toBeLessThan(names.indexOf("PluginC"));
    });

    test("throws on circular dependencies", () => {
      const registry = new PluginRegistry();
      class PluginA extends CollectorPlugin {}
      class PluginB extends CollectorPlugin {}

      registry
        .register(new PluginA(), ["PluginB"])
        .register(new PluginB(), ["PluginA"]);

      expect(() => registry.getOrderedPlugins()).toThrow(
        /circular dependency/i
      );
    });
  });

  describe("ProcessorPlugin", () => {
    test("processes content through plugin chain", async () => {
      class TestProcessor extends ProcessorPlugin {
        async processContent(content) {
          return { ...content, processed: true };
        }
      }

      const plugin = new TestProcessor();
      const content = { type: "test" };
      const processed = await plugin.processContent(content, {});

      expect(processed).toMatchObject({
        type: "test",
        processed: true,
      });
    });
  });

  describe("LoaderPlugin", () => {
    test("loads data with timeout", async () => {
      class TestLoader extends LoaderPlugin {
        async loadData(source) {
          const data = await this.fetchWithTimeout(
            "https://api.example.com/data"
          );
          return data;
        }
      }

      // Mock global fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: "test" }),
        })
      );

      const plugin = new TestLoader();
      const data = await plugin.loadData("test", {});

      expect(data).toMatchObject({ data: "test" });
      expect(global.fetch).toHaveBeenCalled();

      // Cleanup
      global.fetch = undefined;
    });

    test("handles fetch timeout", async () => {
      class TestLoader extends LoaderPlugin {
        async loadData(source) {
          return this.fetchWithTimeout("https://api.example.com/data", 100);
        }
      }

      // Mock slow fetch
      global.fetch = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      const plugin = new TestLoader();
      await expect(plugin.loadData("test", {})).rejects.toThrow(/aborted/i);

      // Cleanup
      global.fetch = undefined;
    });
  });

  describe("Error Handling", () => {
    test("adds errors to context", () => {
      const plugin = new CollectorPlugin();
      const context = { errors: [] };
      const error = new Error("Test error");

      plugin.addError(context, error);

      expect(context.errors[0]).toMatchObject({
        plugin: "CollectorPlugin",
        message: "Test error",
      });
    });

    test("includes stack trace in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const plugin = new CollectorPlugin();
      const context = { errors: [] };
      const error = new Error("Test error");

      plugin.addError(context, error);

      expect(context.errors[0].stack).toBeDefined();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});
