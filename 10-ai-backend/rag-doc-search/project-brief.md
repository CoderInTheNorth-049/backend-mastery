# Mini-capstone — RAG document search API

> **Prerequisites:** all five phase-10 topics · **Est:** 20–30 hours
> Standalone repo. The graduation project for this curriculum: every skill from phases 00–10 in one service.

## Product shape

An API where users upload documents and ask questions answered ONLY from those documents — with citations linking every claim back to its source chunk.

```
 POST /documents        → chunk → embed → store      (vector store + Postgres metadata)
 POST /chat             → embed question → retrieve top-k
                        → build cited context (formatContext)
                        → LLM completion (streaming SSE deltas)
                        → cost-guarded by tenant ledger; tools allowed via registry
 GET  /documents/:id    → source browser (chunk boundaries visible)
```

## Non-negotiable production requirements

| Requirement | Phase source |
|---|---|
| SSE streaming with abort support | 10-01 |
| Vector store behind an interface (in-memory ↔ pgvector swap) | 10-02 |
| Sentence-aware chunking w/ overlap + per-document re-chunk on edit | 10-03 |
| Citations mandatory: answers without `[n]` refs are rejected by YOUR middleware | 10-03 |
| Tools: `search_docs` registered through the guarded executor | 10-04 |
| Per-tenant budget ledger checked pre-request, recorded post-response | 10-05 |
| pino logs + RED metrics + one OTel trace spanning HTTP→retrieve→LLM | phases 02/08 |
| OWASP pass: uploaded docs are untrusted input (prompt-injection review!) | phase 08 |
| CI: lint/typecheck/tests ≥70%/coverage artifact | phase 04 |

## Prompt-injection note (senior signal)

Uploaded documents can contain "ignore previous instructions" attacks. Your defenses: system/user role separation, context fenced with delimiters, instruction to cite-only-from-context, and refusal when context is `NOT_FOUND_IN_SOURCES`. Document your threat model in the README.

## Milestones

| M | Deliverable |
|---|---|
| M0 | Design doc on the phase-09 template (RFC-style, reviewed checklist) |
| M1 | Ingest path: chunkers + store + metadata persistence (Postgres) |
| M2 | Retrieval + cited streaming answer endpoint (SSE) |
| M3 | Budgets + tool registry wired; injection threat-model doc |
| M4 | Observability + load test report + README w/ validated diagrams |

## Definition of done

- [ ] CI green incl. coverage floor; compose boots app+pg (+ollama optional profile)
- [ ] Demo script: ingest 3 docs → ask 3 questions → answers carry working `[n]` citations
- [ ] Load report: concurrent chat streams p95 within SLO; budget ledger blocks over-limit tenant mid-stream gracefully
- [ ] Resume bullet survives the 10-minute follow-up test

**Resume bullet shape:**
*"RAG doc-search API (NestJS/pgvector-ready/SSE): sentence-aware chunking, cited-only answering enforced by middleware, per-tenant budget ledger fail-closed at $X, full OTel trace HTTP→retrieve→LLM."*
