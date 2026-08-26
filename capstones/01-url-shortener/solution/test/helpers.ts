import "reflect-metadata";
import { buildApp } from "../src/app";
import type { AppOptions, BuiltApp } from "../src/app";
import type { LinkStore } from "../src/domain/ports";
import { MemLinkStore } from "../src/infra/memory/mem-link.store";

// Deterministic harness: background flush off so tests pump the pipeline
// explicitly via app.flush().
export async function buildTestApp(options: AppOptions = {}): Promise<BuiltApp> {
  return buildApp({ logLevel: "silent", autoFlushMs: null, ...options });
}

/**
 * Wraps a link store counting findByCode probes - lets e2e tests prove the
 * negative cache absorbed repeat unknown-code lookups.
 */
export function countingLinkStore(
  inner: LinkStore = new MemLinkStore(),
): LinkStore & { findByCodeCalls(): number } {
  let findByCodeCalls = 0;
  return {
    save: (link) => inner.save(link),
    findByCode: async (code: string) => {
      findByCodeCalls += 1;
      return inner.findByCode(code);
    },
    setDisabled: (code, at) => inner.setDisabled(code, at),
    ping: () => inner.ping(),
    findByCodeCalls: (): number => findByCodeCalls,
  };
}
