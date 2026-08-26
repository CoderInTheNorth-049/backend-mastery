# Build guide — Capstone 4: E-commerce Microservices Platform

> **Prerequisites:** phases 06–07 (needs Kafka + LocalStack comfort) · **Est:** 45–60 hours
> The synthesis capstone — your earlier capstones decompose into cooperating services without becoming a distributed monolith.

## Service map

| Service | Owns | Tech emphasis |
|---|---|---|
| `api-gateway` | routing, auth verification, rate limits | phase-05 gateway patterns |
| `catalog` | products, search | Postgres FTS |
| `orders` | order lifecycle, saga orchestrator | Kafka + outbox |
| `payments` | payment intents (simulator via SQS/LocalStack) | idempotency keys |
| `inventory` | stock reservation w/ TTL holds | locking + reservations |
| `notifications` | email/webhook fan-out | reuses flagship-1 patterns |

**Hard rules:** database-per-service · async-first between services (sync calls need a written justification) · one `docker compose up` boots everything · one command runs ALL test suites.

## Milestones

### M1 — Scaffolding & contracts (3 days)

Repo layout (pnpm workspaces or separate repos), shared event-schema package (versioned!), per-service CI pipelines, base images.

**Accept:** `docker compose up` starts every service healthy; schema registry doc committed with v1 events.

### M2 — Catalog + gateway (3 days)

Product CRUD + search; gateway routes with token verification and per-route rate limits.

**Accept:** unauthenticated product browse works end-to-end through the gateway; rate-limit headers visible.

### M3 — Orders with transactional outbox (4 days)

Order placement writes order + outbox row atomically; relay publishes to Kafka. Consumer-side dedupe via inbox table.

**Accept:** duplicate delivery injection test → exactly-once side effects downstream.

### M4 — Payments & inventory services (5 days)

Payment simulator honoring intent-idempotency; inventory reservations with TTL holds and release compensations. Saga orchestrator coordinates place→pay→reserve→confirm.

**Accept:** payment-failure drill triggers full compensation chain; no orphaned holds after TTL sweep.

### M5 — Notifications + observability (4 days)

Notification service consuming order events (email stub + webhook via your flagship-1 patterns). OTel traces spanning gateway→orders→payments; Grafana dashboards for saga completion ratio and consumer lag.

**Accept:** one trace ID visible across three services in Grafana/Jaeger screenshot committed.

### M6 — Chaos & load proof (4 days)

- Chaos suite: kill broker mid-checkout, kill payments mid-compensation, inject duplicate events
- k6 checkout throughput before/after outbox batch-size tuning

---

## Definition of done

- [ ] Saga demo script (`scripts/demo.sh`): happy path + payment-decline compensation + timeout compensation, narrated output
- [ ] Chaos drill evidence committed: system converges, no orphan charges/holds
- [ ] Per-service READMEs + top-level architecture diagram (C4-lite)
- [ ] Load report with tuning curve

**Resume bullet shape:**
*"6-service commerce platform (NestJS/Kafka/k8s): saga-orchestrated checkouts with compensations, transactional-outbox→Kafka pipeline, per-service deploys, OTel cross-service traces; chaos drills prove convergence under broker/payment failures."*

## Answer key

A complete reference implementation lives in [solution/](solution/) — standalone NestJS app, ports-and-adapters with in-memory default wiring (full suite runs offline via `pnpm install && pnpm test`), production adapters behind env switches, and a README mapping every milestone above to the code and tests that prove it. Attempt each milestone yourself first; read it to unblock, not to copy.
