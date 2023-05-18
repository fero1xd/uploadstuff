/** @type {import("eslint").Linter.Config} */
const config = {
  root: true,
  extends: ["next", "turbo", "prettier"], // uses the config in `packages/config/eslint`
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    tsconfigRootDir: __dirname,
    project: ["./packages/*/tsconfig.json"],
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve("next/babel")],
    },
  },
};

module.exports = config;
