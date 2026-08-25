// ── Chunking + cited-context retrieval ───────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

/** Fixed-size sliding window with overlap. overlap must be < size. */
export function chunkFixed(text: string, size: number, overlap: number): string[] {
  throw new Error("TODO: implement chunkFixed");
}

/**
 * Greedy sentence-aware chunker: split on [.!?] keeping the punctuation,
 * pack sentences into chunks up to maxChars (single overlong sentence
 * becomes its own chunk, never split).
 */
export function chunkBySentences(text: string, maxChars: number): string[] {
  throw new Error("TODO: implement chunkBySentences");
}

export interface RetrievedChunk {
  sourceId: string;
  text: string;
  score: number;
}

export interface SearchFnOptions {
  k?: number;
}

/**
 * Wire an embed function and a vector-search function into a retriever.
 * searchFn receives the EMBEDDED query vector and returns scored hits
 * shaped like { id, score, payload } where payload holds { text }.
 */
export function createRetriever(deps: {
  embed(text: string): number[];
  search(queryVector: number[], opts: SearchFnOptions): Array<{ id: string; score: number; payload: { text: string } }>;
}): (question: string, k?: number) => RetrievedChunk[] {
  throw new Error("TODO: implement createRetriever");
}

/**
 * Numbered context block for the LLM prompt:
 *   [1] <chunk text>
 *   [2] <chunk text>
 *   Sources: id1, id2
 * Empty retrieval → the literal fallback string "NOT_FOUND_IN_SOURCES".
 */
export function formatContext(chunks: RetrievedChunk[]): string {
  throw new Error("TODO: implement formatContext");
}
