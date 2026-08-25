# Flagship 2 — Milestone 2: Outbox + relay

> **Unlocked by:** phase 06 topic 05 · **Est:** 10–14 hours
> The anti-dual-write core. Everything later (sagas, projections) consumes events produced THIS way.

## Goal

Every order state change atomically appends an event row; a relay publishes them at-least-once with deterministic ids consumers can dedupe.

## Work items

1. **Outbox table** on the orders DB: `{id bigserial, aggregate_id, type, payload jsonb, created_at, published_at}`
2. **Emission helper:** every service-level mutation writes its events in the SAME transaction — enforce via a small `emitEvent(tx, …)` helper so nobody forgets
3. **Relay worker:**
   - poll `WHERE published_at IS NULL ORDER BY id LIMIT n FOR UPDATE SKIP LOCKED`
   - publish to Kafka (`orders.events`, keyed by aggregate_id) via kafkajs
   - mark published in the SAME transaction as the publish batch's bookkeeping
4. **Deterministic event ids for consumers:** outbox id (or `aggregate-id:seq`), stamped into the envelope

## Accept

- [ ] Kill process between COMMIT and publish → restart → relay delivers exactly once to a spy consumer
- [ ] Two relay instances race → zero duplicates delivered (SKIP LOCKED claims disjoint)
- [ ] Event envelope carries a stable id surviving redelivery

## Resume line fed
*"Transactional outbox → Kafka relay with SKIP LOCKED claiming; crash-injection tests prove no lost or duplicated domain events."*
