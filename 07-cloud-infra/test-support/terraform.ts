import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * PROVIDED — locates a usable terraform binary (same pattern as the k6
 * resolver). Install via `bash scripts/install-terraform.sh` or set TF_BIN.
 */
let cached: string | null | undefined;

export function resolveTerraform(): string | null {
  if (cached !== undefined) return cached;

  const candidates = [
    ...(process.env.TF_BIN ? [process.env.TF_BIN] : []),
    join(homedir(), ".local", "bin", "terraform"),
    "/usr/local/bin/terraform",
    "/usr/bin/terraform",
    "/opt/homebrew/bin/terraform",
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cached = candidate;
      return cached;
    }
  }

  try {
    execFileSync("which", ["terraform"], { stdio: "pipe" });
    cached = "terraform";
  } catch {
    cached = null;
    console.warn(
      "[terraform] binary not found — install via `bash scripts/install-terraform.sh`; terraform specs will SKIP",
    );
  }
  return cached;
}
