import { describe, expect, it, vi } from "vitest";
import {
  chunkBySentences,
  chunkFixed,
  createRetriever,
  formatContext,
  type RetrievedChunk,
} from "./src/rag";

describe("chunkFixed", () => {
  it("slides with overlap: consecutive chunks share exactly `overlap` chars", () => {
    const chunks = chunkFixed("abcdefghij", 4, 2);
    // sliding windows run to the END of input: tails are expected chunks too
    expect(chunks).toEqual(["abcd", "cdef", "efgh", "ghij", "ij"]);
    // consecutive chunks share exactly 2 chars ("cd", then "ef")
  });

  it("single short document yields exactly one chunk (no empties)", () => {
    expect(chunkFixed("short", 100, 10)).toEqual(["short"]);
  });

  it("rejects overlap >= size", () => {
    expect(() => chunkFixed("abc", 5, 5)).toThrow(RangeError);
    expect(() => chunkFixed("abc", 5, -1)).toThrow(RangeError);
  });

  it("empty text yields no chunks", () => {
    expect(chunkFixed("", 10, 2)).toEqual([]);
  });
});

describe("chunkBySentences", () => {
  const doc =
    "First sentence here. Second one is a bit longer than the first! Third? Short.";

  it("packs sentences greedily under maxChars", () => {
    const chunks = chunkBySentences(doc, 60);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(60);
    }
    // all content preserved across chunks
    expect(chunks.join(" ").replace(/\s+/g, " ").trim()).toContain("Third?");
  });

  it("an overlong sentence becomes its own unsplit chunk", () => {
    const long = "A".repeat(120) + ". tail.";
    const chunks = chunkBySentences(long, 50);
    expect(chunks[0].length).toBe(121); // sentence + its period
    expect(chunks).toContain("tail.");
  });

  it("keeps punctuation attached to sentences", () => {
    const [first] = chunkBySentences("Wow! Really?", 100);
    expect(first).toBe("Wow! Really?");
  });
});

describe("createRetriever", () => {
  it("wires embed→search→map and forwards k", () => {
    const calls: Array<{ vector: number[]; opts?: { k?: number } }> = [];
    const docs = [
      { id: "doc-k8s", vector: [1, 0], payload: { text: "kubernetes runs containers" } },
      { id: "doc-redis", vector: [0, 1], payload: { text: "redis caches hot data" } },
    ];

    const retrieve = createRetriever({
      embed: () => [0.9, 0.1],
      search: (vector, opts) => {
        calls.push({ vector, opts });
        return docs
          .map((d) => ({
            id: d.id,
            score: d.vector[0] * vector[0] + d.vector[1] * vector[1],
            payload: d.payload,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, opts?.k ?? 4);
      },
    });

    const hits = retrieve("how do clusters scale?", 1);

    expect(hits).toEqual([
      { sourceId: "doc-k8s", score: expect.any(Number), text: "kubernetes runs containers" },
    ]);
    expect(calls).toEqual([{ vector: [0.9, 0.1], opts: { k: 1 } }]);
  });
});

describe("formatContext", () => {
  it("numbers citations and appends the sources footer", () => {
    const chunks: RetrievedChunk[] = [
      { sourceId: "doc-a", text: "alpha content", score: 0.9 },
      { sourceId: "doc-b", text: "beta content", score: 0.7 },
    ];

    expect(formatContext(chunks)).toBe(
      "[1] alpha content\n[2] beta content\nSources: doc-a, doc-b",
    );
  });

  it("falls back to an explicit sentinel when nothing was retrieved", () => {
    expect(formatContext([])).toBe("NOT_FOUND_IN_SOURCES");
  });
});
