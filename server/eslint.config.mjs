import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",

      indent: ["error", 4, { SwitchCase: 1 }],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "single"],
      semi: ["error", "never"],
      "keyword-spacing": ["error", { before: true }],
      "space-before-blocks": ["error", "always"],
      "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
      "comma-spacing": ["error", { before: false, after: true }],
      "spaced-comment": ["error", "always"],
      "no-trailing-spaces": "error",
      "comma-dangle": ["error", "never"],
      "array-bracket-spacing": ["error", "never"],
      "eol-last": ["error", "always"],
      "no-var": "error",
      "no-debugger": "error",
    },
  },
  {
    ignores: ["dist/**/*"],
  },
];
