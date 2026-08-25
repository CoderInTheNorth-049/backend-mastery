import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Deliberately pragmatic: recommended rules + a few team-culture overrides.
 * Strictness should grow WITH the codebase, not gate day one.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "**/*.js", // k6 scenarios & scripts are plain JS by design
      "capstones/**",
      "flagships/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node-runtime files that aren't part of the TS program.
    files: ["**/*.mjs", "*.config.ts", "vitest.*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // phase-01 explains why; allowed with judgment
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-function": "off",
      "no-empty": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
);
