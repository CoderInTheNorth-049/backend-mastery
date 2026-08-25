import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * PROVIDED — locates a usable k6 binary without assuming global install.
 * Resolution: K6_BIN env → ~/.local/bin/k6 (scripts/install-k6.sh target)
 * → common system paths → PATH lookup.
 */
let cached: string | null | undefined;

export function resolveK6Binary(): string | null {
  if (cached !== undefined) return cached;

  const candidates = [
    ...(process.env.K6_BIN ? [process.env.K6_BIN] : []),
    join(homedir(), ".local", "bin", "k6"),
    "/usr/local/bin/k6",
    "/usr/bin/k6",
    "/opt/homebrew/bin/k6",
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cached = candidate;
      return cached;
    }
  }

  try {
    execFileSync("which", ["k6"], { stdio: "pipe" });
    cached = "k6";
  } catch {
    cached = null;
    console.warn(
      "[k6] binary not found — install via `bash scripts/install-k6.sh`; k6 specs will SKIP",
    );
  }
  return cached;
}
