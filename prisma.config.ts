import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved connection management out of schema.prisma.
 * The CLI (db push / migrate) uses this adapter; the generated client
 * receives its own adapter at construction time (see test-support).
 *
 * DATABASE_URL comes from the environment — the test harness sets it
 * automatically (see vitest.global-setup.ts).
 */
export default defineConfig({
  schema: "03-databases/prisma/schema.prisma",
  // Used by CLI commands like `db push` (the generated client receives a
  // driver adapter at construction time instead — see any spec file).
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
