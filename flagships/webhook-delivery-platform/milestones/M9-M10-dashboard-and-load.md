# Flagship 1 — Milestones 9 & 10: Dashboard + Load/Chaos proof

> **Unlocked by:** phases 04/08 + your React skills · **Est:** 16–24 hours combined
> The finish line: a visible product AND committed evidence it holds up.

## M9 — Operations dashboard (React)

Your frontend background is the differentiator — ship a real ops UI:

1. **Views:** tenant list → endpoint detail (recent deliveries table w/ status chips) → event inspector (payload + attempt history)
2. **Live feed:** SSE stream of delivery results (your phase-10 parser!) filtered per endpoint
3. **Actions:** redrive button wired to the M4 API; disable/enable endpoint; rotate secret w/ confirmation
4. **Charts:** success-ratio sparkline + DLQ depth from the metrics API

**Accept:** dashboard runs against local stack with seeded chaos data; every action has optimistic-UI + error states handled.

## M10 — Load test + chaos drill

1. **Load (k6):** 15 min sustained ingest at target RPS while workers deliver to a mix of fast/slow/failing fake endpoints
   - Commit `reports/load.md`: throughput, p95 ingest, delivery lag trend, resource ceilings found
2. **Chaos drills (scripted, evidence committed):**
   - kill Postgres mid-retry-storm → recovery, zero lost events (outbox proves it)
   - kill a worker mid-delivery → visibility-timeout retry, exactly-once downstream still holds
   - duplicate-event injection → idempotency keys absorb it
3. **Write-up template:** what broke first, why, the fix, re-run numbers

## Definition of done (both milestones)

- [ ] Dashboard demo recorded (gif in README)
- [ ] Chaos runbook: how to re-run each drill locally in one command
- [ ] Final README links: architecture diagram, decisions log, load report, chaos evidence, dashboard gif

## Resume bullet shape
*"Ops dashboard (React/SSE) over an OTel-instrumented delivery fleet; chaos drills (DB kill, worker kill, duplicate injection) with committed evidence and post-fix load deltas."*
