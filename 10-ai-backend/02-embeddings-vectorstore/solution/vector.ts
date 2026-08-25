import { fnv1a } from "./hash";

export interface VectorEntry<T> {
  id: string;
  vector: number[];
  payload: T;
}

export interface SearchHit<T> {
  id: string;
  score: number;
  payload: T;
}

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  return norm === 0 ? vec : vec.map((x) => x / norm);
}

/**
 * Deterministic local embedder (hashed bag-of-words, L2-normalized).
 *
 * NOT semantic — "dog" won't land near "puppy". Its job is reproducible
 * vectors for tests/curriculum; swap the function for real models later.
 */
export function embed(text: string, dims = 64): number[] {
  const vec = new Array<number>(dims).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
    vec[fnv1a(word) % dims] += 1;
  }
  return l2Normalize(vec);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new RangeError("vectors must share dimensionality");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  // Non-negative BOW vectors ⇒ cosine ∈ [0..1]; clamp FP drift.
  return Math.min(1, Math.max(0, dot / Math.sqrt(normA * normB)));
}

export class InMemoryVectorStore<T> {
  private entries = new Map<string, VectorEntry<T>>();
  private order: string[] = []; // insertion order → deterministic tie-breaking

  add(item: VectorEntry<T>): void {
    if (!this.entries.has(item.id)) this.order.push(item.id);
    this.entries.set(item.id, item);
  }

  get size(): number {
    return this.entries.size;
  }

  search(queryVector: number[], k: number): Array<SearchHit<T>> {
    const hits: Array<SearchHit<T> & { seq: number }> = [];

    for (let seq = 0; seq < this.order.length; seq++) {
      const entry = this.entries.get(this.order[seq])!;
      hits.push({
        id: entry.id,
        payload: entry.payload,
        score: cosineSimilarity(queryVector, entry.vector),
        seq,
      });
    }

    // Descending score; ties resolve to earlier insertion.
    return hits
      .sort((a, b) => b.score - a.score || a.seq - b.seq)
      .slice(0, Math.max(0, k))
      .map(({ id, score, payload }) => ({ id, score, payload }));
  }
}
