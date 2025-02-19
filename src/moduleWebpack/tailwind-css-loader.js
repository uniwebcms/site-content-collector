import postpresetenv from "postcss-preset-env";
import tailwindNesting from "@tailwindcss/nesting";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { createRequire } from "module";

export default function getTailwindCssLoader(tailwindPath) {
  // Create a require function that works in ESM for loading the external config
  const require = createRequire(import.meta.url);
  const tailwindConfig = require(tailwindPath);

  return {
    loader: "postcss-loader",
    options: {
      postcssOptions: {
        plugins: [
          postpresetenv,
          tailwindNesting,
          autoprefixer,
          tailwindcss(tailwindConfig),
        ],
      },
    },
  };
}
