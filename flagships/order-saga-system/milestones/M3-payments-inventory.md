# Flagship 2 — Milestone 3: Payments & inventory services

> **Unlocked by:** phases 02/03/06 · **Est:** 14–18 hours

## Goal

Two autonomous services the saga will orchestrate. Both consume Kafka commands/events and answer with their own events. No shared DB with orders — contracts only.

## Payments service

- Owns `payment_intents(id, order_id, state, amount_cents, idempotency_key unique)`
- Consumes `orders.events` (`order.placed`) → creates intent → emits `payment.authorized` / `payment.declined`
- **Simulator config:** env-driven failure rate + latency so saga tests can script chaos deterministically
- All operations idempotent by intent-id AND by consumed event id (inbox table)

## Inventory service

- Owns `stock_items(sku, available, reserved)` + `reservations(id, order_id, sku, qty, expires_at)`
- Consumes commands: `reserve` (TTL hold), `release` (compensation)
- Oversell-proof: reservation decrement inside a transaction guarded by `available >= qty` conditional update; TTL sweep releases expired holds

## Accept

- [ ] Duplicate `order.placed` delivery → ONE intent created (inbox dedupe proven)
- [ ] Concurrent reservations on last-unit stock → exactly one succeeds
- [ ] Simulator at 50% failure still yields a clean event log an orchestrator could reason about
- [ ] Cross-service trace visible via OTel (phase-08 setup)

## Resume line fed
*"Idempotent payment & inventory services communicating purely via Kafka events; deterministic failure simulator for saga testing."*
