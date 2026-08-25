# Flagship 1 — Milestone 4: Reliability pack

> **Unlocked by:** phase 06 · **Est:** 12–16 hours

## Goal

Turn "retries forever" into a POLICY: bounded attempts → dead-letter with redrive, plus per-endpoint circuit breakers so one dead customer endpoint can't clog the pool.

## Work items

1. **Attempt policy:** max 8 attempts over ~24h (backoff schedule table committed as config)
2. **DLQ:** exhausted jobs move to `webhook.dead` (BullMQ) AND a `dead_letters` table with reason + last response
3. **Redrive API:** `POST /admin/redrive {jobIds[]}` re-enqueues; `GET /admin/dead` lists with filters
4. **Circuit breaker per endpoint:**
   - 5 consecutive failures ⇒ OPEN for 60s (deliveries short-circuit to DLQ-path counting)
   - half-open probe after cooldown; success closes it
   - state transitions logged + metric exposed
5. **Alert hooks:** DLQ-depth and breaker-OPEN events emit structured logs ready for alerting rules

## Accept

- [ ] Endpoint failing 8× lands exactly ONE dead-letter with full attempt history attached
- [ ] Redrive replays the ORIGINAL payload byte-for-byte (stored snapshot, not regenerated)
- [ ] Breaker opens after threshold, blocks deliveries during OPEN, half-open probes once, closes on success — proven by a scripted fake endpoint
- [ ] One dead endpoint does NOT delay other endpoints' deliveries (isolation test)

## Resume line fed
*"Bounded-retry delivery with DLQ + one-click redrive and per-endpoint circuit breakers isolating unhealthy consumers."*
