# Topic: Embeddings & vector search — meaning as math

> **Goal:** Build the retrieval core of every AI backend: turn text into vectors, rank by cosine similarity, serve top-k from an in-memory store. The API you implement here maps 1:1 onto pgvector in production (docker-gated stretch).

## Beginner-friendly picks

- 🎥 [3Blue1Brown — Neural networks/embeddings chapters](https://www.youtube.com/@3blue1brown) — vectors-with-meaning intuition
- 📝 [pgvector README](https://github.com/pgvector/pgvector) — skim the query syntax; you'll recognize `order by embedding <=> $1` after this topic
- 🎥 YouTube search: **“cosine similarity explained”** — one 5-minute visual is enough

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Embeddings | text → fixed-length vector where DISTANCE encodes SEMANTIC similarity | [OpenAI embeddings guide](https://platform.openai.com/docs/guides/embeddings) (read free) |
| Cosine vs dot vs L2 | cosine ignores magnitude (direction only); normalized vectors make dot == cosine | [vector similarity explainer](https://www.pinecone.io/learn/vector-similarity/) |
| Top-k retrieval | sort by score, take k — O(n) brute force; indexes (IVFFlat/HNSW) trade recall for speed at scale | [pgvector — indexing](https://github.com/pgvector/pgvector#indexing) |
| Normalization | unit-length vectors: similarities stay comparable across doc lengths | your embedder |
| Dimension discipline | every vector in a store MUST share dimensionality — mixing = runtime garbage | your store's contract |

## Keep in mind

- **Your deterministic bag-of-words embedder is NOT semantic** ("dog" won't match "puppy") — it exists so tests are reproducible without model downloads. Swap in real embeddings via the same interface later.
- **Cosine range for our non-negative vectors is [0, 1]**; with signed models it's [−1, 1]. Know which world you're in.
- **Upsert semantics**: same id replaces, never duplicates.
- **pgvector operators**: `<->` L2, `<=>` cosine distance (1 − similarity), `<#>` negated dot — read them AFTER building the plain math.

## Self-check quiz

<details><summary>1. Why normalize embeddings before storing?</summary>
So dot product equals cosine similarity and long documents don't dominate short ones by magnitude alone. Direction carries the meaning.</details>

<details><summary>2. Two texts share NO words. Bag-of-words cosine?</summary>
0 — orthogonal. Real semantic models would still score partial similarity via learned synonyms; that's their superpower over BOW.</details>

<details><summary>3. Your store returns k results but scores are all ~0.99. Suspicious why?</summary>
Likely duplicate/near-duplicate documents ingested, or a normalization bug making everything parallel. Sanity-check with a disjoint-text probe.</details>

## Assignment

[assignment.md](assignment.md) — implement the deterministic embedder, cosine similarity, and an upsert-capable top-k vector store. Fully deterministic: same inputs, same rankings, forever.
