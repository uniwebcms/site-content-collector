const { join } = require("path");
const { collectSiteContent } = require("../src/index");

const FIXTURES_PATH = join(__dirname, "fixtures", "sample-site");

describe("collectSiteContent", () => {
  test("collects site content correctly", async () => {
    const content = await collectSiteContent(FIXTURES_PATH);

    // Check site metadata
    expect(content.siteMetadata).toEqual({
      name: "Sample Site",
      defaultLanguage: "en",
    });

    // Check pages existence
    expect(content.pages).toHaveProperty("home");
    expect(content.pages).toHaveProperty("about");

    // Check home page structure
    const homePage = content.pages.home;
    expect(homePage.metadata).toEqual({
      title: "Home Page",
      order: 1,
    });
    expect(homePage.sections).toHaveLength(2);

    // Check section hierarchy
    const [hero, features] = homePage.sections;
    expect(hero.id).toBe("1");
    expect(hero.component).toBe("Hero");
    expect(features.id).toBe("2");
    expect(features.subsections).toHaveLength(1);

    // Check subsection
    const featureOne = features.subsections[0];
    expect(featureOne.id).toBe("2.1");
    expect(featureOne.component).toBe("Feature");

    // Check about page
    const aboutPage = content.pages.about;
    expect(aboutPage.metadata.title).toBe("About Us");
    expect(aboutPage.sections).toHaveLength(2);

    // Check JSON section
    const [intro] = aboutPage.sections;
    expect(intro.component).toBe("Intro");
    expect(intro.props.style).toBe("centered");
    expect(intro.content.type).toBe("doc");
  });

  test("handles missing files gracefully", async () => {
    const content = await collectSiteContent(
      join(FIXTURES_PATH, "nonexistent")
    );
    expect(content.siteMetadata).toEqual({});
    expect(content.pages).toEqual({});
    expect(content.errors).toHaveLength(0);
  });

  //   test.only("validates section hierarchy", async () => {
  //     await expect(
  //       collectSiteContent(join(FIXTURES_PATH, "invalid"))
  //     ).rejects.toThrow(/Parent section .* not found/);
  //   });
  // test.only("validates section hierarchy", async () => {
  //   const output = await collectSiteContent(join(FIXTURES_PATH, "invalid"));
  //   console.log(join(FIXTURES_PATH, "invalid"));
  //   console.log(output);
  //   expect(
  //     output.errors.some((err) => /Parent section .* not found/.test(err.error))
  //   ).toBe(true);
  // });
});
