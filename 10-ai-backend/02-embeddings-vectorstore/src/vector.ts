// ── Embeddings + cosine + in-memory vector store ─────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.
import { fnv1a } from "./hash";

/** Deterministic local embedder: hashed bag-of-words, L2-normalized. */
export function embed(text: string, dims = 64): number[] {
  throw new Error("TODO: implement embed");
}

/** Cosine similarity in [0..1] for non-negative vectors; 0 for zero-vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  throw new Error("TODO: implement cosineSimilarity");
}

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

export class InMemoryVectorStore<T> {
  /** Add or replace by id. Vectors must share one dimensionality. */
  add(item: VectorEntry<T>): void {
    throw new Error("TODO: implement add (upsert)");
  }

  get size(): number {
    throw new Error("TODO: number of stored entries");
  }

  /** Top-k by cosine similarity, descending. Ties broken by insertion order. */
  search(queryVector: number[], k: number): Array<SearchHit<T>> {
    throw new Error("TODO: implement search");
  }
}
