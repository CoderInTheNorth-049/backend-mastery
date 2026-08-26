import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Architecture fence: bounded contexts may import ../lib and ../contracts,
// never each other. Folder discipline is what keeps the single deployable
// from rotting into a distributed monolith.
const CONTEXTS = ["orders", "inventory", "payments"] as const;
const IMPORT_PATTERN = /from\s+"(\.\.?\/[^"]+)"/g;

function* typescriptFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* typescriptFiles(full);
    else if (entry.name.endsWith(".ts")) yield full;
  }
}

describe("bounded-context folder discipline", () => {
  it("never lets one context import another's code", () => {
    const srcRoot = resolve(process.cwd(), "src");
    const violations: string[] = [];

    for (const file of typescriptFiles(srcRoot)) {
      const relFile = relative(srcRoot, file);
      const owner = CONTEXTS.find((context) => relFile.startsWith(`${context}/`));
      if (!owner) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(IMPORT_PATTERN)) {
        const target = relative(srcRoot, resolve(dirname(file), match[1]));
        const targetOwner = CONTEXTS.find((context) => target.startsWith(`${context}/`));
        if (targetOwner && targetOwner !== owner) {
          violations.push(`${relFile} imports ${match[1]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
