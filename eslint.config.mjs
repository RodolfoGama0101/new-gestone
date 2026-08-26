import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/*",
      "debug-*.js",
      "jest.config.mjs",
      "jest.setup.js",
      "postcss.config.mjs",
      "tailwind.config.ts",
      "playwright.config.ts",
      "public/sw.js",
      "public/workbox-*.js",
    ],
  },
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;
