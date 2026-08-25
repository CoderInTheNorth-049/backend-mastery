import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * Worker-side view of the backends started by vitest.global-setup.ts.
 * Read synchronously so specs can call describe.skipIf at collection time.
 */
interface BackendFile {
  databaseUrl: string;
  redisUrl: string;
}

const file = join(process.cwd(), ".test-backends.json");

function load(): BackendFile {
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, "utf8")) as BackendFile;
  }
  // Allow running a single spec directly against your own services:
  //   TEST_DATABASE_URL=postgres://... npx vitest run 03-databases/...
  return {
    databaseUrl: process.env.TEST_DATABASE_URL ?? "",
    redisUrl: process.env.TEST_REDIS_URL ?? "",
  };
}

const backends = load();

export const DATABASE_URL = backends.databaseUrl;
export const REDIS_URL = backends.redisUrl;
export const HAS_DB = DATABASE_URL.length > 0;
export const HAS_REDIS = REDIS_URL.length > 0;

/** Test-only cleanup helper (also used by solutions-mode reruns). */
export function forgetBackendsFile(): void {
  try {
    unlinkSync(file);
  } catch {
    /* already gone */
  }
}
