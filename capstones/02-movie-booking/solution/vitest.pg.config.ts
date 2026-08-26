// Same proven recipe as vitest.config.ts, but also picks up the Postgres
// integration spec (named *.int.ts so the default offline suite never runs it).
// Usage: docker compose up -d postgres && DATABASE_URL=... pnpm test:pg
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        target: "es2022",
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts", "test/**/*.int.ts"],
    hookTimeout: 60000,
  },
});
