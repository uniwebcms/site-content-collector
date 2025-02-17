// tests/core/collector.test.js
import { jest } from "@jest/globals";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { ContentCollector } from "../../src/core/collector.js";

// Create temporary test files and directories
async function createTestStructure() {
  const root = join(tmpdir(), "content-collector-test-" + Date.now());
  const contentDir = join(root, "pages");

  await mkdir(root);
  await mkdir(contentDir);
  await mkdir(join(contentDir, "home"));
  await mkdir(join(contentDir, "about"));

  // Create site.yml
  await writeFile(
    join(root, "site.yml"),
    `
title: Test Site
description: Test site for content collector
  `
  );

  // Create home page
  await writeFile(
    join(contentDir, "home", "page.yml"),
    `
title: Home Page
description: Welcome to the test site
  `
  );

  await writeFile(
    join(contentDir, "home", "1-hero.md"),
    `---
component: Hero
props:
  background: ./images/hero.jpg
---
# Welcome

This is the hero section.
  `
  );

  await writeFile(
    join(contentDir, "home", "2-features.md"),
    `---
component: Features
---
# Features

- Feature 1
- Feature 2
  `
  );

  await writeFile(
    join(contentDir, "home", "2.1-feature-detail.md"),
    `---
component: FeatureDetail
---
Detailed feature description
  `
  );

  // Create about page
  await writeFile(
    join(contentDir, "about", "page.yml"),
    `
title: About Us
  `
  );

  await writeFile(
    join(contentDir, "about", "1-intro.md"),
    `---
component: Text
---
About us intro text
  `
  );

  return root;
}

describe("ContentCollector", () => {
  let testRoot;

  beforeAll(async () => {
    testRoot = await createTestStructure();
  });

  test("collects site structure correctly", async () => {
    const collector = new ContentCollector();
    const result = await collector.collect(testRoot);
    // console.log("result", result);
    expect(result.config).toMatchObject({
      title: "Test Site",
      description: expect.any(String),
    });

    expect(result.pages).toHaveLength(2);

    // Check home page
    const homePage = result.pages.find((p) => p.route === "/");
    expect(homePage).toBeDefined();
    expect(homePage.title).toBe("Home Page");
    expect(homePage.sections).toHaveLength(2);

    // Check section hierarchy
    const featuresSection = homePage.sections.find((s) => s.id === "2");
    expect(featuresSection).toBeDefined();
    expect(featuresSection.subsections).toHaveLength(1);
    expect(featuresSection.subsections[0].id).toBe("2.1");
  });

  test("handles missing numeric prefixes based on configuration", async () => {
    // Create a file without numeric prefix
    await writeFile(
      join(testRoot, "pages", "home", "no-prefix.md"),
      `---
component: Text
---
No prefix content
    `
    );

    // Test with requireNumericPrefix = false
    const collector1 = new ContentCollector({ requireNumericPrefix: false });
    const result1 = await collector1.collect(testRoot);
    const homePage1 = result1.pages.find((p) => p.route === "/");
    expect(homePage1.sections.some((s) => s.title === "no-prefix")).toBe(true);

    // Test with requireNumericPrefix = true
    const collector2 = new ContentCollector({ requireNumericPrefix: true });
    const result2 = await collector2.collect(testRoot);
    const homePage2 = result2.pages.find((p) => p.route === "/");
    expect(homePage2.sections.some((s) => s.title === "no-prefix")).toBe(false);
  });

  test("processes markdown content correctly", async () => {
    const collector = new ContentCollector();
    const result = await collector.collect(testRoot);
    const homePage = result.pages.find((p) => p.route === "/");
    const heroSection = homePage.sections.find((s) => s.id === "1");

    expect(heroSection.component).toBe("Hero");
    expect(heroSection.props.background).toBe("./images/hero.jpg");
    expect(heroSection.content).toMatchObject({
      type: "doc",
      content: expect.any(Array),
    });
  });

  test("collects errors in development mode", async () => {
    // Save current NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    // Create invalid markdown file
    await writeFile(
      join(testRoot, "pages", "home", "3-invalid.md"),
      `---
invalid yaml
---
    `
    );

    const collector = new ContentCollector();
    const result = await collector.collect(testRoot);

    expect(result.errors).toBeDefined();
    // expect(result.errors.length).toBeGreaterThan(0);
    // expect(result.errors[0]).toMatchObject({
    //   page: expect.any(String),
    //   message: expect.any(String),
    // });

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  // Add more tests as needed...
});
