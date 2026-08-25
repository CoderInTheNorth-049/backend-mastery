# Phase 06 — Distributed systems & async (~5 weeks)

**Outcome:** build services that survive partial failure. Choose queue vs stream deliberately; write workers with real retry/backoff/DLQ behavior; eliminate dual-write bugs with the transactional outbox + idempotent consumers; orchestrate distributed transactions as sagas and serve reads from CQRS projections.

## Beginner-friendly picks

- 🎥 [Confluent Developer courses](https://developer.confluent.io/courses/) — free video-first Kafka learning
- 🎥 YouTube search: **“exactly once delivery is impossible”** — myth-busting talks that set this phase's tone

## How this phase verifies

| Topic | Runs against |
|---|---|
| [02-bullmq-workers](02-bullmq-workers/) | **real Redis** (harness embedded/your own) — actual retries, delays, dead letters |
| [03-rabbitmq-patterns](03-rabbitmq-patterns/) | in-process topic-routing matcher (the AMQP pattern, no broker needed) |
| [04-kafka-fundamentals](04-kafka-fundamentals/) | an in-memory partition log you build — offsets/partitioning/group semantics made tangible |
| [05-idempotency-outbox](05-idempotency-outbox/) | **real PostgreSQL** via `pg.Pool` (same backends as phase 03) |
| [06-sagas-cqrs](06-sagas-cqrs/) | saga statechart pure-TS + CQRS projector on real PostgreSQL |

Broker binaries (RabbitMQ/Kafka) are a stretch-lab: docker-gated scripts ship as reading companions, but every graded spec runs anywhere.

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-message-brokers-101](01-message-brokers-101/) | 3 days | Delivery-semantics decision matrix |
| [02-bullmq-workers](02-bullmq-workers/) | 5 days | Resilient queue wrapper: attempts, fixed backoff, DLQ mirroring, stats |
| [03-rabbitmq-patterns](03-rabbitmq-patterns/) | 4 days | Topic-exchange routing matcher (`*` / `#`) |
| [04-kafka-fundamentals](04-kafka-fundamentals/) | 5 days | Mini partition log: keys→partitions, offsets, consume windows |
| [05-idempotency-outbox](05-idempotency-outbox/) | 6 days | Transactional outbox + relay (SKIP LOCKED) + inbox dedupe |
| [06-sagas-cqrs](06-sagas-cqrs/) | 6 days | Saga orchestrator statechart + incremental CQRS projector |

Parallel track: **[Flagship 2](../flagships/order-saga-system/project-brief.md)** starts here — M1 guide ships at [`../flagships/order-saga-system/milestones/M1-orders-service.md`](../flagships/order-saga-system/milestones/M1-orders-service.md). Flagship #1 resumes its BullMQ milestone (M2–M3) using topic 02 directly.

## Anchor free resources

- [BullMQ docs](https://docs.bullmq.io/) · [RabbitMQ tutorials](https://www.rabbitmq.com/getstarted.html) · [Confluent Developer (free courses)](https://developer.confluent.io/)
- [microservices.io — saga/outbox patterns](https://microservices.io/patterns/data/saga.html) · [Kafka docs — design](https://kafka.apache.org/documentation/#design)
- [Graham lea? no — "Exactly-once delivery is impossible" classics] start with [Brilliantly wrong: exactly-once myth write-ups collected on the Kafka FAQ](https://kafka.apache.org/documentation/#semantics)

## Done means

- [ ] All five coded topics green (`pnpm test:solutions` proves keys)
- [ ] You can whiteboard the dual-write problem AND its two fixes (outbox, saga) without notes
- [ ] Flagship #1 M2/M3 merged; flagship #2 M1 scaffolded
