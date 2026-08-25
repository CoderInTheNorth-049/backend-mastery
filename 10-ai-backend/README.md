# Phase 10 — AI-native backends (~3 weeks)

**Outcome:** ship LLM-powered endpoints with production discipline: token streaming over SSE, embeddings + vector retrieval, RAG pipelines with citations, tool-calling guardrails, and per-tenant cost controls — the differentiator on 2026+ backend resumes.

## The pgvector decision (documented)

pgvector is **not** bundled with this repo's embedded PostgreSQL binaries. Resolution: **option (a)** —
- unit paths use an **in-process vector store you build yourself** (cosine similarity, top-k) — the semantics transfer 1:1 to pgvector later;
- real-pgvector integration ships as a **docker-gated stretch lab** (compose profile + `CREATE EXTENSION vector`), documented in topic 02's stretch section.

Everything graded here runs **offline**: streaming is parsed from scripted byte chunks; embeddings come from a deterministic local embedder (no model download); tool calls come from scripted LLM turns. Ollama integration is a stretch lab for your own machine.

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-llm-apis-streaming](01-llm-apis-streaming/) | 4 days | SSE frame parser/serializer + OpenAI-style delta extractor |
| [02-embeddings-vectorstore](02-embeddings-vectorstore/) | 4 days | Deterministic embedder + cosine similarity + in-memory top-k store |
| [03-rag-chunking-retrieval](03-rag-chunking-retrieval/) | 5 days | Chunkers (fixed/sentence-aware) + cited-context retriever |
| [04-tool-calling-guardrails](04-tool-calling-guardrails/) | 4 days | Tool registry + argument validation + guarded dispatch loop |
| [05-cost-rate-guardrails](05-cost-rate-guardrails/) | 2 days | Token estimator, cost math, tenant budget ledger |

Mini-capstone: [`rag-doc-search/project-brief.md`](rag-doc-search/project-brief.md) — upload → chunk → embed → retrieve → answer-with-citations API.

## Anchor free resources

- [OpenAI chat completions reference](https://platform.openai.com/docs/api-reference/chat) (read free) · [MDN — Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [pgvector](https://github.com/pgvector/pgvector) · [Vercel AI SDK docs](https://ai-sdk.dev/docs) (MIT OSS)
- [Ollama](https://ollama.com/) — run open models locally, zero API cost
- [OpenTelemetry GenAI conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — tracing shapes for LLM calls

## Done means

- [ ] All five coded topics green (`pnpm test:topic 10-ai-backend/…`)
- [ ] You can explain why “exactly-once” AND “exactly-once tokens” are pipeline properties, not flags
- [ ] Mini-capstone brief reviewed; build scheduled against your flagships timeline
