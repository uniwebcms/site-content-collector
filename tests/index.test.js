import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { collectSiteContent } from "../src/setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_PATH = join(__dirname, "fixtures", "sample-site");

describe("collectSiteContent", () => {
  test("collects site content correctly", async () => {
    const content = await collectSiteContent(FIXTURES_PATH);

    // Check site metadata
    expect(content.config).toEqual({
      name: "Sample Site",
      defaultLanguage: "en",
    });

    // Check pages existence
    expect(content.pages).toHaveLength(2);

    // expect(content.pages).toHaveProperty("about");

    // Check home page structure
    const homePage = content.pages[0];
    expect(homePage.order).toBe(1);
    expect(homePage.title).toBe("Home Page");
    expect(homePage.route).toBe("/");
    expect(homePage.sections).toHaveLength(2);

    // expect(homePage).toEqual({
    //   route: "/",
    //   title: "Home Page",
    //   order: 1,
    // });

    // Check section hierarchy
    const [hero, features] = homePage.sections;
    // console.log("hero", JSON.stringify(hero));
    // First section: Hero
    expect(hero.id).toBe("1");
    expect(hero.component).toBe("Hero");

    expect(hero.content).toMatchObject({
      type: "doc",
      content: expect.any(Array),
    });

    expect(hero.content.content[2]).toMatchObject({
      type: "paragraph",
      content: [
        {
          type: "image",
          attrs: {
            src: "/public/img/logo_light.svg",
            title: "my icon",
            svg: expect.any(String),
            metadata: {
              alt: "Logo of Uniweb Modules",
            },
          },
        },
      ],
    });

    // Second section: Features
    expect(features.id).toBe("2");
    expect(features.subsections).toHaveLength(1);

    // Check subsection of features
    const featureOne = features.subsections[0];
    expect(featureOne.id).toBe("2.1");
    expect(featureOne.component).toBe("Feature");

    // Check about page
    const aboutPage = content.pages[1];
    expect(aboutPage.route).toBe("/about");
    expect(aboutPage.title).toBe("About Us");
    expect(aboutPage.sections).toHaveLength(2);

    // Check JSON section
    const [intro] = aboutPage.sections;
    expect(intro.component).toBe("Intro");
    expect(intro.props.style).toBe("centered");
    expect(intro.content.type).toBe("doc");
  });

  // test("handles missing files gracefully", async () => {
  //   const content = await collectSiteContent(
  //     join(FIXTURES_PATH, "nonexistent")
  //   );
  //   expect(content.config).toEqual({});
  //   expect(content.pages).toEqual({});
  //   expect(content.errors).toHaveLength(0);
  // });

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
