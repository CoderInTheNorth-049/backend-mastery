import "reflect-metadata";
import { buildApp } from "../src/app";
import type { BuiltApp } from "../src/app";
export { waitFor } from "../src/lib/wait-for";

export interface TestAppOptions {
  autoRelayMs?: number | null;
  stockSeed?: Record<string, number>;
  prices?: Record<string, number>;
}

// Deterministic harness: background relay off by default so tests pump the
// pipeline explicitly via drain(). Pass autoRelayMs to exercise live mode.
export async function buildTestApp(options: TestAppOptions = {}): Promise<BuiltApp> {
  return buildApp({
    logLevel: "warn",
    autoRelayMs: options.autoRelayMs ?? null,
    stockSeed: options.stockSeed ?? { "SKU-1": 10, "SKU-2": 5 },
    prices: options.prices ?? { "SKU-1": 1500, "SKU-2": 24000 },
  });
}
