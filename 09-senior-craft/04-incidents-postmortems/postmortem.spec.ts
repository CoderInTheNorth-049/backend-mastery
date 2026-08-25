import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "solution")
    : join(__dirname, "submission");

const path = join(DIR, "postmortem.md");

describe("postmortem structure", () => {
  const src = readFileSync(path, "utf8");

  it("uses all seven template sections in order", () => {
    const sections = ["## 1. Summary", "## 2. Impact", "## 3. Timeline", "## 4. Contributing factors", "## 5.", "## 6.", "## 7."];
    let cursor = -1;
    for (const heading of sections) {
      const idx = src.indexOf(heading);
      expect(idx, `missing section: ${heading}`).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });
});

describe("postmortem — key facts extracted from the timeline", () => {
  const src = readFileSync(path, "utf8");

  it("carries the impact numbers", () => {
    expect(src).toContain("28"); // minutes of customer impact
    expect(src).toContain("38%"); // peak 5xx
    const attempts = src.includes("4,100") || src.includes("4100");
    expect(attempts).toBe(true);
    expect(src).toMatch(/2,900|2900/); // affected users
  });

  it("timeline includes deploy, alert, mitigation and resolution times", () => {
    for (const t of ["02:05", "02:14", "02:29", "02:33"]) {
      expect(src).toContain(t);
    }
  });

  it("names ≥5 contributing factors, all framed as system gaps", () => {
    const section = /## 4\. Contributing factors([\s\S]*?)(\n## |$)/.exec(src)?.[1] ?? "";
    const numbered = (section.match(/^\d+\./gm) ?? []).length;
    expect(numbered).toBeGreaterThanOrEqual(5);
  });

  it("has ≥4 action items with owners/priority columns", () => {
    const table = /## 6\.[\s\S]*?(\n\|[\s\S]*)/.exec(src)?.[0] ?? "";
    const rows = (table.match(/^\|(?!\s*[-:])/gm) ?? []).length;
    expect(rows).toBeGreaterThanOrEqual(5); // header + separator + ≥3 rows
    expect(table.toLowerCase()).toContain("owner");
  });
});

describe("postmortem — blameless language enforced", () => {
  const src = readFileSync(path, "utf8");

  it.each([
    /forgot/i,
    /careless/i,
    /negligen/i,
    /his fault/i,
    /her fault/i,
    /\b(he|she) (broke|messed)/i,
  ])("contains no blame phrase like %s", (pattern) => {
    expect(src).not.toMatch(pattern);
  });
});
