# Topic: RAG pipelines — chunking, retrieval & honest citations

> **Goal:** Retrieval-Augmented Generation is 80% plumbing discipline: chunk documents sensibly, retrieve the right pieces, and format context WITH citations so answers are checkable. You'll build the plumbing and grade its guarantees.

## Beginner-friendly picks

- 📝 [Pinecone — chunking strategies](https://www.pinecone.io/learn/chunking-strategies/) — the visual taxonomy
- 🎥 YouTube search: **“RAG explained”** — one architecture overview before the assignment

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Why chunk at all | embedders have token limits AND granularity matters: whole docs dilute meaning | [Pinecone — chunking](https://www.pinecone.io/learn/chunking-strategies/) |
| Fixed vs sentence-aware splitting | fixed+overlap is dumb but predictable; sentence-aware keeps thoughts intact | your assignment implements both |
| Overlap | boundary sentences appear in TWO chunks so no answer falls in a crack | assignment math |
| Grounding & citations | the model may only use provided context; every claim maps to `[n]` source ids — hallucination becomes auditable | [Anthropic RAG guide concepts](https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation) (free docs) |
| Retrieval as dependency | retriever = function `(query) => chunks[]`; swap vector store/BM25/hybrid behind it | hexagonal recap |

## Keep in mind

- **Chunk size is a recall/precision dial**: tiny = fragmented context; huge = diluted embeddings. Start ~500–1000 chars w/ 10–20% overlap.
- **Overlap must be smaller than size** or you get infinite loops (spec guards this).
- **Cite by CHUNK ID, not position** — positions shift as the corpus changes; ids don't.
- Empty retrieval ⇒ say "not found in sources" rather than letting the LLM freestyle. Guardrails > vibes.

## Self-check quiz

<details><summary>1. size=100, overlap=30. What starts each chunk after the first?</summary>
Previous end − 30 chars. Chunks: [0..100), [70..170), [140..240)… guaranteeing 30 chars of shared context.</details>

<details><summary>2. A 45-char document with size=100 yields how many fixed chunks?</summary>
One — never emit empty or duplicate-only trailing chunks.</details>

<details><summary>3. Why number citations [1][2] instead of quoting raw ids?</summary>
Numbers are compact tokens the model copies reliably into prose; raw ids bloat prompts and invite typos. Map numbers→ids ONLY in the sources footer you control.</details>

## Assignment

[assignment.md](assignment.md) — implement `chunkFixed`, `chunkBySentences`, `createRetriever` (embed → store-search → map), and `formatContext` with numbered citations + sources footer.
