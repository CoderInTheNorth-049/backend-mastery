# backend-mastery

**A hands-on, project-driven curriculum that takes you from frontend developer to senior-level backend engineer.**

Built for a React + JavaScript developer who wants backend depth on their resume — with assignments you actually implement, tests that grade you automatically, and capstone/flagship projects worth talking about in interviews at top companies.

[![CI](https://github.com/YOUR_USERNAME/backend-mastery/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

---

## The stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript / Node.js** | Leverages your JS/React base; fastest credible path to senior BE |
| Framework | **NestJS** (after raw Express) | Enterprise structure: DI, modules, guards — mirrors Spring-style backends used at scale |
| Database | **PostgreSQL + Prisma**, Redis | Industry-default pairing; Redis for cache/queues/rate-limiting |
| Async | BullMQ → RabbitMQ → Kafka | Progressive: start simple, end where senior jobs live |
| Cloud | Docker, Kubernetes (kind), **AWS via LocalStack** | LocalStack = free local emulation of S3/SQS/SNS/DynamoDB/Lambda |
| Testing | Vitest + Supertest + Testcontainers + MSW | The 2026 Node testing consensus |
| AI | pgvector RAG, streaming LLM APIs | Table-stakes for modern backend hires |

> **Resource policy:** every linked resource is free and open access. Paid items are only ever marked 💰 as optional extras — never required. See [docs/resource-policy.md](docs/resource-policy.md).

## How assignments work

Every topic folder follows the same layout:

```
topic/
├── README.md        # concepts, curated links, gotchas ("keep in mind"), self-check quiz
├── assignment.md    # your task + progressive hints
├── src/             # stub files YOU implement          (code topics)
├── submission/      # artifacts you author              (infra/CI topics)
├── <name>.spec.ts   # failing tests = acceptance criteria
└── solution/        # answer key (verified by the same specs — see below)
```

There are **three assignment types** — each topic's `assignment.md` tells you which one it is:

| Type | What you do | How it's graded |
|---|---|---|
| 🧪 **Code** (most topics) | Implement the `src/` stubs | Vitest specs go green |
| ✍️ **Written** (design docs, decisions) | Create the named `.md` file | Self-scored rubric inside the assignment |
| 📦 **Submission artifact** (Docker/K8s/Terraform/CI) | Author the named file(s) in `submission/` | Specs parse & structurally grade your file |

### Running things

```bash
pnpm install          # once
pnpm test             # everything (will fail until you implement!)
pnpm test:topic 00-foundations/02-http-protocol   # one topic
pnpm coverage         # coverage report → coverage/index.html
pnpm test:solutions   # answer keys vs the same specs (maintainers/CI)
```

- Same runner (Vitest) everywhere; `test:topic <path>` works for any phase.
- **Phase 03/06 topics need PostgreSQL/Redis** — provisioned automatically (Docker → embedded fallback). If they can't start, those specs SKIP cleanly. See [docs/setup-guide.md](docs/setup-guide.md).
- Two topics use external binaries: install once with `bash scripts/install-k6.sh` and `bash scripts/install-terraform.sh`. Without them, related specs skip.
- Written-deliverable names to create are always stated in the assignment (`scaling-notes.md`, `decisions.md`, …).

### The loop

1. **Read** the topic `README.md` — start with its *Beginner-friendly picks* section.
2. **Do the assignment** for your type until graded-green / self-scored-threshold.
3. **Peek hints** when stuck — try before reading the solution (≥45 honest minutes).
4. **Compare** with `solution/` afterwards; write your `notes.md` retro.

CI runs typecheck + lint + answer-key verification on every push, so the repo never rots. Deeper mechanics live in [docs/tooling-guide.md](docs/tooling-guide.md).

## Repo map

| Phase | Folder | Focus | Status |
|---|---|---|---|
| 00 | [00-foundations](00-foundations/) | HTTP/TCP/DNS/TLS, Linux & Git | ✅ ready |
| 01 | [01-typescript-node](01-typescript-node/) | TS type system, event loop, async, streams | ✅ ready |
| 02 | [02-apis-nestjs](02-apis-nestjs/) | REST design, Express, DI (NestJS internals), JWT auth, OpenAPI | ✅ ready |
| 03 | [03-databases](03-databases/) | SQL, Postgres+Prisma, indexing, concurrency, Redis | ✅ ready |
| 04 | [04-testing-quality](04-testing-quality/) | Micro test-runner, DB harness, contracts, k6, CI gates | ✅ ready |
| 05 | [05-system-design](05-system-design/) | Scaling math, caching, consistent hashing, CAP/PACELC, 5 classic designs | ✅ ready |
| 06 | [06-distributed-async](06-distributed-async/) | BullMQ workers, topic routing, partition log, outbox, sagas/CQRS | ✅ ready |
| 07 | [07-cloud-infra](07-cloud-infra/) | Docker/K8s manifests (graded contracts), AWS SDK w/ mocks, Terraform HCL | ✅ ready |
| 08 | [08-observability-security](08-observability-security/) | pino, prom-client, OTel spans, budgets, OWASP labs, secret scanner | ✅ ready |
| 09 | [09-senior-craft](09-senior-craft/) | Design docs/RFCs, DDD, reviews, incident response | 🚧 |
| 10 | [10-ai-backend](10-ai-backend/) | LLM streaming, embeddings+pgvector, RAG, guardrails | 🚧 |

Projects:

- **Capstones** ([capstones/](capstones/)) — guided builds woven through the phases: URL shortener, movie booking, realtime chat, microservices e-commerce.
- **Flagships** ([flagships/](flagships/)) — two resume-grade systems built to production standards:
  - [Webhook Delivery Platform](flagships/webhook-delivery-platform/project-brief.md) — retries/backoff, DLQs, idempotency, HMAC signing, multi-tenancy, SQS/SNS via LocalStack.
  - [Event-driven Order System (Kafka sagas)](flagships/order-saga-system/project-brief.md) — transactional outbox, saga orchestration, CQRS read models.

## Progress tracker

Tick these as you go — commit the change, keep yourself honest.

- [ ] **00** Internet protocols · [ ] HTTP deep-dive · [ ] Linux & Git
- [ ] **01** TS type system · [ ] Event loop & async · [ ] Streams & iterators
- [ ] **02** REST design · [ ] Express basics · [ ] Dependency injection · [ ] JWT auth from scratch
- [ ] **03** SQL fundamentals · [ ] Prisma repositories · [ ] Indexes & EXPLAIN · [ ] Concurrency lab · [ ] Redis caching
- [ ] **04** Micro test-runner · [ ] Database harness · [ ] MSW + contracts · [ ] k6 load testing · [ ] CI workflow
- [ ] **05** Scaling estimates · [ ] Cache math · [ ] Consistent-hash ring · [ ] CAP/PACELC decisions · [ ] ADR exercise · [ ] Paradigm matrix · [ ] Five classic designs
- [ ] **06** Delivery semantics · [ ] BullMQ worker kit · [ ] Topic-exchange matcher · [ ] Mini partition log · [ ] Outbox + inbox · [ ] Saga runner + projector
- [ ] **07** Dockerfile + compose · [ ] K8s manifests · [ ] AWS SDK wrappers · [ ] Terraform HCL · [ ] Zero-downtime plan
- [ ] **08** Logger factory · [ ] RED metrics · [ ] OTel span trees · [ ] Budget math · [ ] OWASP defenses · [ ] Secret scanner
- [ ] **09** RFC writing · [ ] DDD aggregate · [ ] Three review labs · [ ] Blameless postmortem · [ ] Interview story bank
- [ ] **10** SSE streaming · [ ] Embeddings + vector store · [ ] RAG chunking/citations · [ ] Tool guardrails · [ ] Budget ledger

🎉 **That's the whole roadmap.** Now: capstones → flagships → ship the resume bullets.

## Docs

- [PLAN.md](PLAN.md) — **build status & continuation guide** (what's done, what ships next)
- [Setup guide](docs/setup-guide.md) — toolchain install, first run
- [Tooling guide](docs/tooling-guide.md) — how tests/coverage/solutions-mode work
- [Career guide](docs/career-guide.md) — resume bullets, interview loops, positioning
- [Resource policy](docs/resource-policy.md) — the free-only rule + core library

## License

MIT — learn freely, share freely.
