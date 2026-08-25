import { describe, expect, it } from "vitest";
import { InMemoryVectorStore, cosineSimilarity, embed } from "./src/vector";

describe("embed", () => {
  const dims = 64;

  it("produces L2-normalized vectors (length ≈ 1)", () => {
    const v = embed("the quick brown fox", dims);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("is deterministic for identical input", () => {
    expect(embed("hello world", dims)).toEqual(embed("hello world", dims));
  });

  it("is case-insensitive and punctuation-tolerant", () => {
    expect(embed("Hello, WORLD!", dims)).toEqual(embed("hello world", dims));
  });

  it("gives identical texts similarity ≈ 1", () => {
    const a = embed("kubernetes cluster autoscaling", dims);
    const b = embed("KUBERNETES CLUSTER AUTOSCALING", dims);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
  });

  it("gives disjoint texts similarity 0", () => {
    const a = embed("alpha beta gamma", dims);
    // use enough distinct words that no bucket collides
    const b = embed("delta epsilon zeta eta theta iota kappa lambda", dims);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe("cosineSimilarity", () => {
  it("computes the classic right-angle case as 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("parallel vectors score 1 regardless of magnitude", () => {
    expect(cosineSimilarity([2, 0], [5, 0])).toBe(1);
  });

  it("rejects mismatched dimensionality", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(RangeError);
  });

  it("zero vectors score 0 without NaN", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe("InMemoryVectorStore", () => {
  it("starts empty and counts upserts correctly", () => {
    const store = new InMemoryVectorStore<string>();
    expect(store.size).toBe(0);

    store.add({ id: "a", vector: embed("alpha"), payload: "A" });
    store.add({ id: "a", vector: embed("alpha beta"), payload: "A2" }); // upsert
    store.add({ id: "b", vector: embed("gamma"), payload: "B" });

    expect(store.size).toBe(2); // 'a' replaced, not duplicated
  });

  it("returns top-k by descending similarity", () => {
    const store = new InMemoryVectorStore<string>();
    store.add({ id: "cat-doc", vector: embed("cat cat cat feline"), payload: "cats" });
    store.add({ id: "dog-doc", vector: embed("dog dog canine"), payload: "dogs" });
    store.add({ id: "mixed", vector: embed("cat dog"), payload: "both" });

    const query = embed("cat");
    const hits = store.search(query, 2);

    expect(hits).toHaveLength(2);
    expect(hits[0].id).toBe("cat-doc");
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);
  });

  it("k larger than store returns everything, sorted", () => {
    const store = new InMemoryVectorStore<number>();
    store.add({ id: "x", vector: embed("x"), payload: 1 });
    store.add({ id: "y", vector: embed("y"), payload: 2 });

    const hits = store.search(embed("y"), 10);
    expect(hits.map((h) => h.id)).toEqual(["y", "x"]);
  });

  it("search on an empty store yields an empty array", () => {
    expect(new InMemoryVectorStore().search(embed("q"), 3)).toEqual([]);
  });
});
