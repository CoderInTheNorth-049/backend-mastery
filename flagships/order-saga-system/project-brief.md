# Flagship 2 — Event-driven Order System (Kafka sagas)

> **Est:** 50–80 hours across phases 06–10 · **Build guide:** milestones below
> **Why this project:** distributed transactions done RIGHT — sagas, transactional outbox, CQRS read models — the exact territory of senior system-design interviews, demonstrated with working code instead of hand-waving.

## What you're building

An order-management core for a marketplace: customers place orders; payment authorization, inventory reservation, and shipping arrangement coordinate through **Kafka events** orchestrated by a saga. Failures trigger compensations (release stock, void payment) with a full audit trail. A CQRS read model serves order-history queries at read scale while writes stay normalized in Postgres. Dual-write bugs are eliminated by a **transactional outbox + relay**.

## Architecture sketch

```
   POST /orders ──▶ orders svc ──▶ [PG tx: order + outbox row] ──▶ relay ──▶ Kafka: orders.events
                                        │                                       │
                     (single DB commit = no dual-write bug)              consumers:
                                                                          ▼
                                              payments svc ◀── commands topic (saga orchestrates)
                                                   │  auth/void via payment-simulator
                                                   ▼
                                              inventory svc: reserve / release (TTL holds)
                                                   ▼
                                              shipping svc: arrange / cancel
                                                   
   saga state machine (orchestration style) ──▶ order.status transitions + compensation log
                                                   
   read side: projector consumes events ──▶ denormalized order_view (CQRS query API)
```

## Milestone plan

| M | Deliverable | Phase gate |
|---|---|---|
| 0 | Design doc: saga diagram (happy + 3 failure paths), event schema registry (versioned!), consistency guarantees table | 05/06 |
| 1 | Orders service: create/order model, state machine enum enforced in code AND db constraint | 03 |
| 2 | Transactional outbox + background relay with at-least-once publishing + dedupe on consumer side | 06 |
| 3 | Payment simulator service (configurable flakiness!) exposing auth/capture/void; idempotent by intent-id | 02 |
| 4 | Inventory service: reservation TTLs, release compensations, oversell-proof under concurrency | 03/04 |
| 5 | Saga orchestrator: step timeouts, retry policies per step type, compensation execution + audit trail | 06 |
| 6 | CQRS projector → order_view store + query API; eventual-consistency lag metric exposed | 06 |
| 7 | Infra: full docker-compose (kafka+zookeeper/redpanda, 2×PG), kind deploy profile, schema-registry-lite | 07 |
| 8 | Observability: trace an order across all services via OTel; Grafana: saga completion ratio, compensation rate, consumer lag | 08 |
| 9 | Chaos suite: broker-down recovery, kill-during-compensation drill, duplicate-event injection tests | 04 |
| 10 | Load report: checkout throughput vs outbox-batch-size tuning curve | 04 |

## The decisions you must be able to defend

1. Orchestration vs choreography for THIS domain — and when the answer flips.
2. Outbox relay: polling vs CDC (Debezium-style); what breaks at 10k events/sec.
3. Consumer-side dedup strategy (inbox table? processed-offset cache?) and its failure windows.
4. Why "exactly-once" is marketing: what your pipeline actually guarantees, precisely.
5. Read-model staleness: how the UI communicates it, and the SLO you'd set.

## Definition of done (resume-grade bar)

- [ ] CI ≥75% coverage including saga compensation branches
- [ ] Demo script (`scripts/demo.sh`): happy path, payment-decline compensation, timeout compensation — narrated output
- [ ] Docs: saga diagrams (mermaid), event catalog with versioning policy, ADRs for decisions above
- [ ] Chaos evidence committed; consumer-lag dashboard screenshot
- [ ] Interview story bank: 3 war stories extracted from chaos drills (STAR format)

**Resume bullet shape:** *"Event-driven order platform (NestJS/Kafka/Postgres): transactional-outbox→Kafka pipeline, saga orchestration with compensations, CQRS read models; duplicate-injection & broker-kill chaos suites green; OTel cross-service traces."*
