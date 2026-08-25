# Flagship 2 — Milestone 1: Orders service foundation

> **Unlocked by:** phase 06 topic 05 (outbox) · **Est:** 12–18 hours
> This milestone builds the write-side core that every later saga piece hangs off. Standalone repo (`order-saga/`), NestJS + Postgres.

## Goal

A production-shaped orders service that owns the order lifecycle AND emits its events reliably — via a transactional outbox, exactly as practiced in [06-idempotency-outbox](../../../06-distributed-async/05-idempotency-outbox/outbox.spec.ts).

## Deliverables

### 1. Order model & state machine

```
draft → placed → paid → fulfilled
                 ↘ cancelled ↗ (compensations land here)
```

- Postgres table `orders(id uuid pk default gen_random_uuid(), user_id, total_cents, status, created_at, updated_at)`
- Status transitions enforced in BOTH code and DB (`CHECK` constraint or trigger — document which and why)

### 2. Endpoints

| Method | Path | Behavior |
|---|---|---|
| POST | /orders | create draft → place in one flow; idempotency-key header required |
| GET | /orders/:id | read own model |
| POST | /orders/:id/pay | placed → paid; emits `order.paid` |
| POST | /orders/:id/cancel | allowed from placed/paid; emits `order.cancelled` |

Invalid transition → `409 Conflict` with machine-readable code.

### 3. Transactional outbox (the heart)

- `POST /orders` and pay/cancel each insert their event row in the SAME transaction.
- Outbox row: `{id bigserial, aggregate_id, type ('order.placed'|…), payload jsonb, published_at}`.
- Relay worker (BullMQ repeatable job OR setInterval service) using your phase-06 `relayOnce` pattern with SKIP LOCKED.
- Event ids for consumers = outbox row id (deterministic!).

**Accept:** kill the process between COMMIT and publish → restart → relay delivers exactly once to a spy consumer.

### 4. Testing bar

- Unit: state-machine transitions incl. every illegal move
- Integration: outbox atomicity (crash-injection seam like phase 06's `__failAt`), relay idempotence under concurrency
- Coverage ≥70% on order module

### 5. Docs

- README section: state diagram (mermaid), decisions log entry "why outbox over CDC here"
- OpenAPI generated & committed snapshot

## Explicitly OUT of scope (later milestones)

Kafka swap (M5), payment/inventory services (M3–4), CQRS projector (M6). Resist the pull.

## Resume bullet this milestone feeds

*"Order service with enforced lifecycle state machine and transactional-outbox event publication; crash-injection tests prove no lost/duplicate events."*
