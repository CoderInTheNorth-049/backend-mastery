import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Structure spot-check: content quality is rubric-scored (see template).
const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "solution")
    : join(__dirname, "submission");

const file = join(DIR, "rfc-001-kafka-backbone.md");

describe("RFC structure spot-check", () => {
  const src = readFileSync(file, "utf8");
  const sectionOrder = [
    "## 1. Summary",
    "## 2. Context",
    "## 3. Goals",
    "## 4. Options considered",
    "## 5. Decision",
    "## 6. Consequences",
    "## 7. Rollout plan",
    "## 8. Open questions",
  ];

  it("uses all eight template sections in order", () => {
    let cursor = -1;
    for (const heading of sectionOrder) {
      const idx = src.indexOf(heading);
      expect(idx, `missing section: ${heading}`).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it("considers at least three options", () => {
    const optionCount = (src.match(/### Option /g) ?? []).length;
    expect(optionCount).toBeGreaterThanOrEqual(3);
  });

  it("engages the real trade-off vocabulary", () => {
    for (const term of ["Kafka", "BullMQ", "replay", "partition"]) {
      expect(src).toContain(term);
    }
  });

  it("decision is present and terse (≤2 sentences in its section)", () => {
    const decision = /## 5\. Decision([\s\S]*?)(\n## |$)/.exec(src)?.[1] ?? "";
    const sentences = decision
      .split(/[.!?](?:\s|$)/)
      .map((x) => x.trim())
      .filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it("asks reviewers explicit open questions", () => {
    const open = /## 8\. Open questions([\s\S]*?)$/.exec(src)?.[1] ?? "";
    expect(open.trim().length).toBeGreaterThan(20);
  });
});
