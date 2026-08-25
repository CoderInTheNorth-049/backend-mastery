import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "solution")
    : join(__dirname, "submission");

const path = join(DIR, "interview-prep.md");
const src = readFileSync(path, "utf8");

describe("interview-prep.md — structure", () => {
  it("section 1: self-assessment names two weak axes", () => {
    const s1 = /## 1\.[\s\S]*?(?=\n## 2\.)/.exec(src)?.[0] ?? "";
    expect(s1.toLowerCase()).toContain("self-assessment");
    const weakAxes = s1.match(/weak(ness|axes)?/gi) ?? [];
    expect(weakAxes.length).toBeGreaterThanOrEqual(1);
  });

  it("section 2: six STAR stories with all four labels each", () => {
    const s2 = /## 2\.[\s\S]*?(?=\n## 3\.)/.exec(src)?.[0] ?? "";
    const stories = (s2.match(/### Story \d:/g) ?? []).length;
    expect(stories).toBe(6);

    const storyBlocks = s2.split(/### Story \d:/).slice(1);
    for (const block of storyBlocks) {
      for (const label of ["Situation", "Task", "Action", "Result"]) {
        expect(block, `story missing ${label} label`).toMatch(new RegExp(label, "i"));
      }
    }
  });

  it("stories carry numeric results in ≥4 of them", () => {
    const s2 = /## 2\.[\s\S]*?(?=\n## 3\.)/.exec(src)?.[0] ?? "";
    const blocks = s2.split(/### Story \d:/).slice(1);
    const withNumbers = blocks.filter((b) => /\d/.test(b)).length;
    expect(withNumbers).toBeGreaterThanOrEqual(4);
  });

  it("section 3 maps all five behavioral questions", () => {
    const s3 = /## 3\.[\s\S]*$/.exec(src)?.[0] ?? "";
    for (const q of ["conflict", "failure", "deadline", "ambiguity", "proudest"]) {
      expect(s3.toLowerCase()).toContain(q);
    }
  });
});
