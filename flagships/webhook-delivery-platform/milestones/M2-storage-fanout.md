# Flagship 1 — Milestone 2: Storage & fan-out

> **Unlocked by:** phases 03/06 · **Est:** 12–16 hours · Builds directly on M1's ingest API.

## Goal

Give every accepted webhook event a durable home and a delivery job PER SUBSCRIBED ENDPOINT — with zero dual-write bugs.

## Work items

1. **Tables:** `tenants`, `endpoints(id, tenant_id, url, secret_version, status)`, `events(id uuid, tenant_id, type, payload jsonb, idempotency_key unique(tenant_id,key))`, `delivery_jobs(event_id, endpoint_id, status, attempts)`
2. **Fan-out planner:** on ingest (post-idempotency), create one delivery_job per active endpoint of the tenant — inside the SAME transaction as the event row
3. **BullMQ producer:** relay new delivery_jobs into the `webhook.deliver` queue (phase-06 outbox/relay pattern verbatim)
4. **Admin endpoints:** endpoint CRUD + rotation of signing secrets (versioned, old secret honored during overlap window)

## Accept

- [ ] Crash the process between event-commit and enqueue → restart → jobs appear exactly once (relay dedupe by job key)
- [ ] Two endpoints subscribed ⇒ two independent delivery jobs, each retryable separately
- [ ] Endpoint disable mid-flight stops NEW jobs but doesn't kill queued ones (document this policy)

## Resume line fed
*"Transactional outbox→queue fan-out creating per-endpoint delivery jobs with crash-safe dedupe."*
