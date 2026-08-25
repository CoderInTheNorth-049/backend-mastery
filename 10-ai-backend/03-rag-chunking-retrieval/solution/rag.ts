export interface RetrievedChunk {
  sourceId: string;
  text: string;
  score: number;
}

export interface SearchFnOptions {
  k?: number;
}

/** Fixed-size sliding window with overlap. overlap must be < size. */
export function chunkFixed(text: string, size: number, overlap: number): string[] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`size must be a positive integer, got ${size}`);
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    throw new RangeError(`overlap must satisfy 0 <= overlap < size, got ${overlap}`);
  }

  const clean = text.trim();
  if (clean.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    chunks.push(clean.slice(start, start + size));
    start += size - overlap; // step < size guarantees `overlap` shared chars
  }

  return chunks;
}

/** Greedy sentence packer: sentences split on [.!?], punctuation kept. */
export function chunkBySentences(text: string, maxChars: number): string[] {
  if (!Number.isInteger(maxChars) || maxChars < 1) {
    throw new RangeError(`maxChars must be a positive integer`);
  }

  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [];
  const chunks: string[] = [];
  let current = "";

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length === 0) continue;

    // A single overlong sentence becomes its own chunk — never split mid-thought.
    if (sentence.length > maxChars) {
      if (current.length > 0) {
        chunks.push(current);
        current = "";
      }
      chunks.push(sentence);
      continue;
    }

    const candidate = current.length === 0 ? sentence : `${current} ${sentence}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current.length > 0) chunks.push(current);
      current = sentence;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

export interface SearchFnOptions {
  k?: number;
}

/**
 * Compose embed → search → map. The search dependency is duck-typed so any
 * store (in-memory now, pgvector later) plugs in unchanged.
 */
export function createRetriever(deps: {
  embed(text: string): number[];
  search(queryVector: number[], opts: SearchFnOptions): Array<{
    id: string;
    score: number;
    payload: { text: string };
  }>;
}): (question: string, k?: number) => RetrievedChunk[] {
  return (question: string, k = 4) => {
    const vector = deps.embed(question);
    return deps
      .search(vector, { k })
      .map((hit) => ({
        sourceId: hit.id,
        text: hit.payload.text,
        score: hit.score,
      }));
  };
}

const NOT_FOUND = "NOT_FOUND_IN_SOURCES";

/** Numbered citations + sources footer; empty retrieval → explicit fallback. */
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return NOT_FOUND;

  const numbered = chunks
    .map((chunk, i) => `[${i + 1}] ${chunk.text}`)
    .join("\n");

  const sourceIds = chunks.map((c) => c.sourceId).join(", ");
  return `${numbered}\nSources: ${sourceIds}`;
}
