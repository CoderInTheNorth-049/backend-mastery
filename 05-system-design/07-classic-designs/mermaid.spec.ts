import { describe, expect, it } from "vitest";
import { validateMermaid } from "./src/mermaid";

const TEMPLATE_DIAGRAM = `flowchart LR
  client[Client] --> lb[L7 Load Balancer]
  lb --> api[API Service]
  api --- cache[(Redis)]
  api -.-> queue[Kafka]
`;

describe("validateMermaid", () => {
  it("accepts the repo template diagram verbatim", () => {
    expect(validateMermaid(TEMPLATE_DIAGRAM)).toEqual({ ok: true });
  });

  it("accepts bare node ids and comments", () => {
    const src = `graph TD
  %% topology sketch
  a --> b
  standaloneNode
`;
    expect(validateMermaid(src)).toEqual({ ok: true });
  });

  it("rejects empty sources at file level (line 0)", () => {
    for (const src of ["", "   \n  "]) {
      const result = validateMermaid(src);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].line).toBe(0);
        expect(result.errors[0].message).toMatch(/empty/i);
      }
    }
  });

  it("requires a known header as the first statement", () => {
    const badHeader = validateMermaid("digraph G {\n a-->b\n}");
    expect(badHeader.ok).toBe(false);

    const lateHeader = validateMermaid("a --> b\nflowchart TD");
    expect(lateHeader.ok).toBe(false);
    if (!lateHeader.ok) {
      expect(JSON.stringify(lateHeader.errors)).toMatch(/line 2/);
    }
  });

  it("flags multiple headers", () => {
    const result = validateMermaid("graph TD\na --> b\ngraph LR");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /duplicate/.test(e.message))).toBe(true);
    }
  });

  it("reports unrecognized statements with line numbers", () => {
    const result = validateMermaid(`flowchart LR
  a --> b
  what even is this
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        { line: 3, message: expect.stringMatching(/line 3: unrecognized/) },
      ]);
    }
  });

  it("catches unbalanced label brackets", () => {
    const result = validateMermaid(`flowchart LR
  a[Open --> b[Closed]
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /unbalanced/.test(e.message))).toBe(true);
    }
  });

  it("supports labeled edges and dotted arrows", () => {
    const src = `flowchart LR
  order[Order API] -->|publishes| kafka[(Kafka)]
  worker -.-> kafka
`;
    expect(validateMermaid(src)).toEqual({ ok: true });
  });

  it("tolerates CRLF and trailing whitespace", () => {
    const src = "flowchart TD\r\n  a --> b   \r\n";
    expect(validateMermaid(src)).toEqual({ ok: true });
  });
});
