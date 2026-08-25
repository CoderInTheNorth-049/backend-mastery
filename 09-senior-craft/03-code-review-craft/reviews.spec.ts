import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Reviews are file artifacts: mode-selected like k6/terraform graders.
const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "reviews", "solution")
    : join(__dirname, "reviews", "submission");

function readReview(name: string): string {
  const p = join(DIR, name);
  expect(existsSync(p), `missing review file: ${p}`).toBe(true);
  return readFileSync(p, "utf8");
}

interface Plant {
  symbol: string;
  category: string;
}

const REQUIRED: Record<string, Plant[]> = {
  "pr-1.md": [
    { symbol: "chargeWithRetry", category: "correctness" },
    { symbol: "MAX_RETRIES", category: "concurrency" },
  ],
  "pr-2.md": [
    { symbol: "countAll", category: "performance" },
    { symbol: "page * 1000", category: "correctness" },
  ],
  "pr-3.md": [
    { symbol: "randomUUID", category: "security" },
    { symbol: "tokens", category: "security" },
    { symbol: "requestReset", category: "security" },
  ],
};

describe("code reviews — planted flaws caught", () => {
  for (const [file, plants] of Object.entries(REQUIRED)) {
    describe(file, () => {
      const review = readReview(file);

      it("uses bracketed category tags somewhere in the review", () => {
        const tags = review.match(/\[[a-z]+\]/g) ?? [];
        const tagSet = new Set(tags.map((t) => t.toLowerCase()));
        for (const { category } of plants) {
          expect(tagSet.has(`[${category}]`), `missing [${category}] tag`).toBe(true);
        }
      });

      for (const plant of plants) {
        it(`flags “${plant.symbol}” as a ${plant.category} issue`, () => {
          expect(review).toContain(plant.symbol);
          // The symbol and its category must appear reasonably close together
          // (within ~400 chars) so the comment actually ties them together.
          const idx = review.indexOf(plant.symbol);
          const window = review.slice(Math.max(0, idx - 200), idx + 400).toLowerCase();
          expect(window).toContain(plant.category);
        });
      }

      it("includes at least one positive note (norms teach both ways)", () => {
        expect(review.toLowerCase()).toMatch(/good|nice|clear|well|solid|like/);
      });
    });
  }
});
