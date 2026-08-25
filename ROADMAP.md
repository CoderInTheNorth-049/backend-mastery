# ROADMAP — frontend dev → senior backend engineer

**Assumption:** 10–15 focused hours/week → ~10 months. Full-time (30h+/wk) compresses to ~4–5 months. Adjust pace, keep the order.

> **Building this repo?** This file is the *learning* plan. Build status, conventions for continuing development, and what ships next live in [PLAN.md](PLAN.md).

## Philosophy

1. **Project-driven, not tutorial-driven.** Every concept is immediately burned into muscle memory by an assignment you must make pass.
2. **Understand one layer below your daily tools.** You'll implement JWTs, DI containers, HTTP parsers, and retry logic *by hand* before using libraries that do it for you. Seniors are hired because they know what the abstraction hides.
3. **Production habits from day one.** Tests, types, error handling, and docs are part of every assignment, not a later "polish" step.
4. **Spaced repetition via projects.** Capstones force you to re-touch older topics in new combinations.

## Weekly rhythm

| Day | Activity |
|---|---|
| 2 × 90 min | Read topic README + linked resources. Take notes in the topic folder (`notes.md`) |
| 2 × 90 min | Implement the assignment until specs pass |
| 1 × 60–120 min | Compare with `solution/`, write a short retro: what surprised you? |
| Weekend slot | Capstone work or system-design reading (phase-dependent) |

**Rule:** never move to the next topic with red tests. Never read the solution before ≥45 honest minutes stuck.

## Phase plan

| # | Phase | Weeks | Milestone — you can now... |
|---|---|---|---|
| 00 | [Foundations](00-foundations/) | 2 | Explain what happens between typing a URL and seeing bytes; live comfortably in terminal/Git |
| 01 | [TypeScript & Node internals](01-typescript-node/) | 3 | Build typed utilities; explain & exploit the event loop; stream data without blowing memory |
| 02 | [APIs & NestJS](02-apis-nestjs/) | 4 | Ship a tested REST API with auth, validation, docs — and explain Nest's DI magic from first principles |
| 03 | [Databases](03-databases/) | 5 | Model data, write SQL confidently, tune queries with indexes/EXPLAIN, cache with Redis, use Prisma like a pro |
| 04 | [Testing & quality](04-testing-quality/) | 3 | Design a test pyramid by building a runner; own DB-lifecycle harnesses; mock boundaries, load-test with k6, enforce gates in CI |
| 05 | [System design](05-system-design/) | 6 | Whiteboard URL-shortener/Netflix/Uber designs; reason about CAP, caching, sharding trade-offs |
| 06 | [Distributed & async](06-distributed-async/) | 5 | Build event-driven services on Kafka/RabbitMQ; apply sagas, outbox, idempotency correctly |
| 07 | [Cloud & infra](07-cloud-infra/) | 5 | Containerize, deploy to K8s locally, integrate AWS services through LocalStack, write basic Terraform |
| 08 | [Observability & security](08-observability-security/) | 4 | Instrument services (logs/traces/metrics), set SLOs, pass an OWASP-style review of your own API |
| 09 | [Senior craft](09-senior-craft/) | 3 | Write RFC/design docs, lead a mock design review, run incident postmortems |
| 10 | [AI backend](10-ai-backend/) | 3 | Build streaming LLM endpoints + pgvector RAG with cost/rate guardrails |

Parallel track: **capstones** start after phase 02 ([schedule here](capstones/)) and **flagships** occupy phases 06–10 ([briefs](flagships/)).

## Checkpoints (be honest with yourself)

- **After phase 02:** rebuild any assignment from memory in <1 day.
- **After phase 05:** record yourself designing a system for 35 minutes; watch it back; cringe; repeat monthly.
- **After flagships:** each repo has CI-green tests ≥70% coverage, OpenAPI docs, README with architecture diagram, and a load-test report. If not, it's not done.
- **Interview readiness:** you can answer "walk me through a hard bug" with a real story from this repo, and every resume bullet survives 10 minutes of follow-up questions.

## What "senior" actually means (calibrate expectations)

Senior ≈ ownership + judgment, not years or framework count. This repo builds both:
- **Ownership:** end-to-end delivery — design → build → test → deploy → observe → document.
- **Judgment:** knowing *why* (CAP vs PACELC when picking a DB, queue vs stream, sync vs async) and defending it under questioning.

Job titles don't transfer 1:1 across companies. Target **backend engineer roles at product companies** where your full-stack React+Node profile is an asset; big-tech "senior" often expects prior senior tenure — aim there after 1–2 years of backend ownership elsewhere, or via internal transfers.

## FAQ

**Why NestJS and not Go/Rust?** Fastest credible path from your JS base; enterprise patterns (DI, modules) transfer to Spring/K8s-era stacks. Go remains a great second language — add it later if targeting infra-heavy teams.

**Why PostgreSQL only? Why not MongoDB?** Relational fundamentals + transactions + indexing are what interviews and most products need. A NoSQL module lands in phase 03 as optional context.

**Where does AI fit?** Phase 10 — because modern backends increasingly expose LLM features (streaming, RAG, tool calls). It builds directly on phases 02–08 skills rather than replacing them.

**Can I skip phases?** 00–01 can be skimmed if you're strong there (still do the assignments — they're calibrated). Everything from 02 onward compounds.
