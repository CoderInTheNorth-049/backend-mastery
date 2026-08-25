# Capstone 4 — E-commerce Microservices Platform

> **When:** after Phase 06–07 · **Est:** ~45–60 hours · **Full build guide ships with phase 07.**

The synthesis capstone: your earlier three capstones decompose into services that must cooperate without distributed-monolith pathologies.

## Services (deliberately small)

| Service | Owns | Tech emphasis |
|---|---|---|
| `api-gateway` | routing, auth token verification, rate limits | phase 05 gateway patterns |
| `catalog` | products, search | Postgres FTS or Meilisearch-free alternative |
| `orders` | order lifecycle, saga orchestrator | Kafka, outbox |
| `payments` | payment intents (LocalStack SQS-driven simulator) | idempotency keys |
| `inventory` | stock reservation | locking + reservations TTL |
| `notifications` | email/webhook fan-out | reuses flagship #1 patterns! |

## Non-negotiables

- **Database-per-service.** No cross-service joins; contracts over the wire only.
- **Async-first between services** (Kafka events); sync calls need documented justification.
- One docker-compose up → whole platform; one command runs ALL test suites.
- Per-service READMEs + top-level architecture diagram (C4-lite).

## Definition of done

- [ ] Order saga demo script: happy path + payment-failure compensation recorded in docs
- [ ] Chaos drill: kill payments mid-checkout → system converges, no orphan charges
- [ ] Traces span gateway→orders→payments (OTel) viewable in local Grafana/Jaeger
- [ ] Load report: checkout throughput before/after outbox optimization

**Resume bullet shape:** *"6-service commerce platform (NestJS/Kafka/k8s): saga-ordered checkouts with compensations, per-service deploys via compose→kind, OTel traces across services."*
