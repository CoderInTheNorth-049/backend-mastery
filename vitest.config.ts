import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import swc from "unplugin-swc";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Answer-key verification mode.
 *
 * Every assignment ships with failing specs that import from `./src/...`.
 * The reference implementations live in `./solution/...`.
 *
 * Running `pnpm test:solutions` sets SOLUTION_MODE=1 which transparently
 * redirects every `./src/...` import to its `./solution/...` counterpart —
 * proving the answer keys pass the exact same tests learners must satisfy.
 */
function solutionsPlugin(): Plugin | null {
  if (process.env.SOLUTION_MODE !== "1") return null;
  return {
    name: "answer-key-redirect",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer) return null;
      const match = /^(?:\.\.?\/)+src\/(.+)$/.exec(source);
      if (!match) return null;
      const base = join(dirname(importer), "solution");
      for (const candidate of [
        join(base, match[1]),
        join(base, `${match[1]}.ts`),
        join(base, match[1].replace(/\.(js|mjs)$/, ""), "index.ts"),
      ]) {
        if (existsSync(candidate) && !existsSync(`${candidate}/`)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    // SWC (not esbuild) must transpile TS here because ONLY it supports
    // `emitDecoratorMetadata` — the `design:paramtypes` reflection that
    // decorator-based DI (NestJS-style) depends on. Classic gotcha.
    swc.vite({
      module: { type: "es6" },
      jsc: {
        target: "es2022",
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
    solutionsPlugin() as Plugin,
  ],
  test: {
    environment: "node",
    globalSetup: "./vitest.global-setup.ts",
    hookTimeout: 240_000, // first-run container pulls / embedded initdb
    // Keeps combined per-file connection pools inside embedded Postgres's
    // default max_connections during full-suite runs.
    maxWorkers: 4,
    include: ["**/*.spec.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/solution/**",
      "capstones/**",
      "flagships/**",
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "lcov"],
      include: ["0*/**/src/**/*.ts", "1*/**/src/**/*.ts"],
      exclude: ["**/solution/**", "**/*.spec.ts", "**/index.ts"],
      // Coverage gates: uncomment and tune once your phase reaches testing depth.
      // thresholds: { lines: 70, functions: 60, branches: 55, statements: 70 },
    },
  },
});
