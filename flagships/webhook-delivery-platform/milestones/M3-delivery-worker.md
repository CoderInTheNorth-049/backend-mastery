# Flagship 1 — Milestone 3: Delivery worker v1

> **Unlocked by:** phases 01/02 · **Est:** 10–14 hours

## Goal

The HTTP delivery engine: timeouts, exponential backoff with jitter, per-attempt logging — the code your phase-00 retry assignment foreshadowed.

## Work items

1. **Worker pool** consuming `webhook.deliver` (concurrency configurable via env)
2. **Delivery attempt:**
   - `AbortSignal.timeout(deliveryTimeoutMs)` (default 10s)
   - POST JSON body = event payload; headers include `X-Webhook-Event-Id`, `X-Webhook-Signature` (HMAC-SHA256 of raw body with endpoint secret — full signing lands M8, stub it now)
   - success = any 2xx within timeout
3. **Backoff:** exponential base 30s → 5m cap, FULL JITTER; attempt number recorded
4. **Attempt log:** every try appends to `delivery_attempts(job_id, attempt, status_code|null, error|null, duration_ms, at)`
5. **Per-attempt idempotency:** deliveries carry the event id so customer endpoints can dedupe (document in your future API docs)

## Accept

- [ ] Integration test with MSW-mocked endpoints: 2 failures then 201 → exactly 3 attempts logged with correct backoff ordering
- [ ] Timeout test: hanging endpoint aborts at the budget and counts as a failed attempt
- [ ] Worker crash mid-attempt → job retried after visibility timeout, no lost attempts

## Resume line fed
*"Delivery workers with jittered exponential backoff and full per-attempt audit logs."*
