# PLAN.md — build status & continuation guide

**Audience:** anyone (including future-you or an AI session) continuing development of this repo. The *learning* plan lives in [ROADMAP.md](ROADMAP.md); this file is the *build* plan: what exists, what's next, and the conventions that keep new content consistent with what's here.

---

## 1. Status snapshot

| Phase | Folder | Status | Topics | Graded tests |
|---|---|---|---|---|
| 00 Foundations | `00-foundations/` | ✅ complete | 3 (DNS resolver, HTTP-from-bytes + retry, Linux/Git lab) | 23 |
| 01 TypeScript & Node | `01-typescript-node/` | ✅ complete | 3 (typed utils/emitter, event loop pool, NDJSON streams) | 41 |
| 02 APIs & NestJS | `02-apis-nestjs/` | ✅ complete | 4 (REST design doc, Express users-API, DI container, HS256 JWT) | 50 |
| 03 Databases | `03-databases/` | ✅ complete | 5 coded + 1 reading (SQL, Prisma repos, indexes, concurrency, Redis cache, NoSQL context) | 33 |
| 04 Testing quality | `04-testing-quality/` | ✅ complete | 5 (micro test-runner, DB harness, MSW+contracts, k6 load, CI gates) | 32 |
| 05 System design | `05-system-design/` | ✅ complete | 5 written + 3 coded (cache math, hash ring, mermaid validator) + 5 design prompts & template | 42 |
| 06 Distributed async | `06-distributed-async/` | ✅ complete | 1 written + 5 coded (BullMQ kit, topic matcher, partition log, outbox/inbox, saga+projector) + flagship-2 M1 guide | 45 |
| 07 Cloud & infra | `07-cloud-infra/` | ✅ complete | 4 coded + 1 written (Dockerfile/compose contracts, K8s manifests, AWS SDK w/ client-mock, Terraform HCL fmt-checked, deploy plan) + flagship-1 M7 guide | 36 |
| 08 Observ & security | `08-observability-security/` | ✅ complete | 4 coded + 1 written + exploit-fix lab (logger, metrics, tracing, budgets, OWASP defenses, diff scanner) | 41 |
| 09 Senior craft | `09-senior-craft/` | ✅ complete | RFC writing (spec-checked structure), DDD Money/Order aggregate (autograded), 3 planted-flaw review labs, blameless postmortem (blame-language enforced absent), interview story bank (structure-checked) | 46 |
| 10 AI backend | `10-ai-backend/` | ✅ complete | SSE streaming parser/serializer, deterministic embedder + vector store, chunkers + cited retriever, tool registry w/ guardrails, budget ledger + mini-capstone brief | 56 |
| **TOTAL** | | **all 11 phases** | **41 topics** | **475 tests** |

- **Verification state:** `pnpm typecheck` clean · `pnpm lint` 0 errors · `pnpm test:solutions` **352/352 green** across all phases.
- Learner mode (`pnpm test`) is red by design on unimplemented stubs; DB/k6 specs skip or fail informatively until backends/binary exist.
- Capstones (4) and flagships (2) have full project briefs; their step-by-step build guides ship alongside the phase that unlocks them.

## 2. Build log

| Session | Shipped |
|---|---|
| 1 | Repo skeleton, ROADMAP/docs, monorepo tooling (pnpm, vitest, SWC-for-decorators, CI), phases 00–02 fully populated, capstone+flagship briefs. Flagships chosen: webhook delivery platform + Kafka order-saga system. |
| 2 | **Phase 03**: three-tier DB harness (env URL → Docker/Testcontainers → embedded binaries), Prisma 7 driver-adapter setup, deterministic seed, 5 coded topics verified against real PostgreSQL 18 + Redis; k6 groundwork deferred. |
| 3 | **Phase 04**: micro test-runner, DatabaseHarness over provider interface, MSW client + contract verifier, k6 smoke/stress executed live, YAML-parsed CI workflow assignment; ESLint/Prettier configs; real CI upgraded (lint job, concurrency, coverage artifact). |
| 4 | **Phase 05**: scaling/caching/CAP/microservices/paradigms topics (written+quiz), autograded cache-math & consistent-hash ring (FNV-1a — djb2 rejected after measuring sequential-key clustering!), mermaid flowchart validator for design docs, shared design-doc template + five classic prompts with rubrics, URL-shortener capstone BUILD GUIDE. |
| 5 | **Phase 06**: delivery-semantics matrix; BullMQ resilient-queue wrapper graded on live Redis (attempts semantics, DLQ mirror, delayed promotion, FIFO); AMQP topic-exchange matcher (`*`/`#` DP); in-memory Kafka PartitionLog (key routing, offsets, consume windows); transactional outbox + SKIP LOCKED relay + inbox dedupe on real Postgres (crash-window & concurrency proofs); saga orchestrator statechart + watermarked CQRS projector. Flagship #2 M1 guide added. globalSetup provisioning extended to phase 06. |
| 6 | **Phase 07**: Dockerfile/compose structural contracts; K8s Deployment+Service YAML graders (probes/resources/selectors cross-file consistency); S3 DocStore + SQS EventPublisher graded via aws-sdk-client-mock (offline!); Terraform HCL validated by REAL `terraform fmt -check` binary (+vacuous-pass guard test) via installer script & resolver; zero-downtime expand→migrate→contract written plan. Flagship #1 M7 (LocalStack AWS-mode) note added. New deps: aws-sdk v3 clients + aws-sdk-client-mock. |
| 8 | **Docs pass (learner feedback)**: beginner-friendly resource blocks (YouTube channels/videos, interactive labs like SQLBolt/PGExercises/LearnGitBranching/Killercoda/PortSwigger, tag-page links) added to ALL 55 phase+topic READMEs; root README rewritten into an explicit "How assignments work" guide (three assignment types table, run commands, backend/binary prerequisites). Repaired missing `00-foundations/README.md` and created never-written `04-testing-quality/02-integration-testcontainers/{README,assignment}.md`. |
| 9 | **Phase 09**: RFC template + spec-checked Kafka-backbone RFC; DDD tactical (GIVEN anemic model to critique) + autograded Money/Order aggregate (private-ctor factory, DomainError invariants, currency discipline, 100-item cap); THREE planted-flaw PR diffs graded by parsing learner reviews for symbol+category-tag proximity; fictional SEV1 timeline → blameless postmortem (numbers extracted, ≥5 system gaps, zero blame-regex); interview story bank structure-grader. Plus 4a Part A: phases 00–02 assignments rewritten plain-language (Problem→Tasks→DoD) with docs/assignment-style.md template — all 116 prior tests verified unchanged. |
| 10 | **Phase 10**: pgvector decision RESOLVED as option (a) — in-process store for graded paths, docker-gated pgvector lab documented; SSE frame serializer + chunk-boundary-safe async parser (split-anywhere tests); OpenAI delta extractor w/ [DONE] sentinel; deterministic FNV-bag-of-words embedder (normalized) + cosine + upsert/top-k InMemoryVectorStore; fixed/sentence chunkers (overlap guard, overlong-sentence rule) + retriever composition + numbered-citation context formatter w/ NOT_FOUND sentinel; ToolRegistry/validateArgs/executeToolCall/createGuardedExecutor (strict unknown-key rejection, NaN-number rejection, fail-closed call-count brake); estimateTokens/estimateRequestCost/BudgetLedger (fail-closed boundary math, tenant isolation, defaultLimit). Mini-capstone brief: RAG doc-search API incl. prompt-injection threat model. Deps: none new. |
| 9 | **Phase 08**: pino logger factory graded by parsing its own JSON output (redaction-before-serialization, request-id children, level policy); prom-client RED module asserted on exposition-format lines; OTel v2 instrumented checkout verified via InMemorySpanExporter (v2 lessons: constructor spanProcessors, parentSpanContext property, NO implicit context propagation in base SDK → explicit setSpan threading); error-budget pure fns w/ integer basis-points FP fix + canonical 14.4× burn-rate tie-in; OWASP exploit-fix lab (vulnerable reference proven broken, learner defenses proven holding: SQLi/IDOR/XSS); gitleaks-style diff scanner w/ masked findings. Deps: pino, prom-client, otel api+trace-base. |

## 3. Conventions any continuation MUST follow

### Content contract (every topic folder)
```
README.md        concepts → curated FREE links → "keep in mind" gotchas → self-check quiz (<details>)
assignment.md    task + exact contracts + progressive <details> hints + acceptance criteria + stretch
src/*.ts         learner stubs that THROW "TODO"; public API matches spec imports exactly
*.spec.ts        failing learner specs at topic root (never import solution/)
solution/*.ts    answer key with identical public API
```
- Resource policy: **free/open-access links only** (paid = 💰 optional footnotes, never required).
- Specs are the contract: if the spec and prose disagree, fix whichever is wrong — then make sure solutions mode still passes.

### Answer-key verification mechanics
- `SOLUTION_MODE=1 vitest run` activates a vite plugin in `vitest.config.ts` that rewrites `./src/x` imports to `./solution/x`. CI runs it to keep keys honest.
- **Limits:** only *imports* are redirected. File-artifacts (k6 scripts read via `readFileSync`) must select directory by mode themselves — see `04-load-testing-k6/loadtest.spec.ts` (`SCRIPTS_DIR`). Follow this pattern for future non-import artifacts.
- Type-only cross-imports inside `solution/` pointing back to `../src/*` resolve correctly (redirector passes through when no solution counterpart exists).

### Test backends (phase 03+)
- Resolution order: `TEST_DATABASE_URL`/`TEST_REDIS_URL` env → Docker/Testcontainers → embedded binaries (unique per-launch data dirs, LD_LIBRARY_PATH symlink fix in `03-databases/test-support/backend.ts`).
- `vitest.global-setup.ts` provisions ONLY for full runs / `03-*`+ filters (see `runNeedsDatabases()`); workers read `.test-backends.json` via `03-databases/test-support/env.ts`; specs gate with `describe.skipIf(!HAS_DB)`.
- `maxWorkers: 4` in vitest config is load-bearing (embedded PG connection limits). Don't raise without checking.
- Prisma 7: driver adapters (`@prisma/adapter-pg`) at client construction; schema has NO url; CLI uses `prisma.config.ts`; `db push` from globalSetup sets Prisma's AI-agent consent env var **only for ephemeral backends**.

### Tooling rules
- Decorators require the SWC vite plugin (esbuild can't emit metadata) — never remove from vitest config.
- Lint: warnings allowed (stub unused-vars), errors forbidden. Prefer fixing code over disabling rules; per-line disables need a justification comment.
- Coverage stays informational in repo CI (answer-key redirection skews %). Threshold gates belong to learner workflows (topic 05 pattern).
- New runtime deps go in `devDependencies` (this is a learning repo); pnpm `onlyBuiltDependencies` list may need entries for engine-downloading packages.

### Verification checklist before ending ANY build session
```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm test:solutions
# plus: pnpm test (learner mode sanity — red on stubs, skips where expected)
```
Update root `README.md` table/tracker + this file's snapshot table in the same pass.

## 4. Remaining work (post-curriculum wrap-up)

**Curriculum COMPLETE: phases 00–10, all graded.** Remaining polish items:

1. ~~Capstone build guides~~ ✅ ALL FOUR: capstone-1 expanded full guide (M0–M6 with acceptance gates); capstones 2/3/4 full build-guides created.
2. **Flagship completion guides** ✅ ALL: flagship-1 milestones M2–M5, M7(obs), M8(security), M9+M10 combined + index.md; flagship-2 M2–M5 + index.md (M0 stays brief-level by design).
3. **4a Part B** ✅ COMPLETE — all coded/written topic assignments across phases 00–08 now plain-language. **B2 details:** light problem-story prepends for written topics (05×7, 06/01); full rewrites for coded topics (06×5 incl. FIVE newly created assignment files that had never existed: 06/{02..05} + 05/03-database-scaling; 07/{01,02,04,05}; 08 all six — with 08/{05,06} extracted from inline README sections into proper assignment.md files). Comprehensive audit confirms every topic folder now has assignment.md. Process note held from B1: explicit path checklist used, zero slips this pass.
4. **Optional labs**: Ollama integration notes; LocalStack compose profile live-verification; pgvector docker lab (decision resolved → option (a)).
5. **Career refresh**: re-run docs/career-guide.md against the final repo state.

## 5. Completed build log (archive)

| # | Session |
|---|---|
| 1 | Skeleton, ROADMAP/docs, tooling (pnpm/vitest/SWC/CI), phases 00–02, flagship choices + briefs |
| 2 | Phase 03: three-tier DB harness, Prisma 7 adapters, deterministic seed, 5 coded topics on real PG+Redis |
| 3 | Phase 04: micro test-runner, DatabaseHarness, MSW client + contract verifier, live k6 runs, YAML CI grader, ESLint/Prettier |
| 4 | Phase 05: cache-math, consistent-hash ring (FNV-1a after djb2 clustering lesson), mermaid validator, design template + 5 prompts, capstone-1 BUILD GUIDE |
| 5 | Phase 06: delivery-semantics matrix, BullMQ kit (live Redis), AMQP topic matcher, PartitionLog, outbox/inbox (real PG), saga statechart + projector; flagship-2 M1 guide; provisioning heuristic extended to 06 |
| 6 | Phase 07: Dockerfile/compose/K8s structural graders, aws-sdk-client-mock wrappers, REAL terraform fmt-check (+vacuous-pass guard), deploy-plan; flagship-1 M7 note; deps: aws-sdk v3 + mock |
| 7 | Docs pass: beginner picks in all 55 READMEs; root README assignment-types guide; repaired missing 00-foundations/README + phase-04 harness topic docs |
| 8 | Phase 08: pino output-parsing specs, prom-client exposition assertions, OTel v2 InMemorySpanExporter trees (explicit-context lesson), basis-point budget math (14.4× tie-in), OWASP exploit-fix lab, gitleaks-style scanner |
| 9 | Phase 09 + 4a Part A: spec-checked RFC, autograded Money/Order aggregates, planted-flaw review labs w/ proximity-tag grading, blameless postmortem w/ zero-blame regex enforcement, STAR story bank grader; phases 00–02 assignments rewritten plain-language |

## 6. Open decisions / TODOs

- [x] ~~Phase 05 mermaid validation~~ → automated via validateMermaid
- [x] ~~Phase 10 pgvector strategy~~ → option (a): in-process store for graded paths, docker-gated pgvector lab documented
- [x] ~~4a Part B: phases 03–08 assignment rewrites~~ ✅ COMPLETE (B1: 00–02+03–04 · B2: 05–08 + created 5 missing files)
- [ ] Career-guide blog companion once flagships have load-test reports
- [ ] ESLint warnings (~139, stub TODOs) tolerated; revisit if they hide signal
