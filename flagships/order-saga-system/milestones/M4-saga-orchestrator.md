# Flagship 2 — Milestone 4: Saga orchestrator + compensations

> **Unlocked by:** phase 06 topic 06 · **Est:** 14–18 hours · The milestone interviews probe hardest.

## Goal

A persisted saga orchestrator that drives place→authorize→reserve→confirm and unwinds via compensations (void payment, release stock) on any failure or timeout — with a full audit trail.

## Work items

1. **Saga definition (declarative):**
   ```
   steps: [chargePayment, reserveStock, arrangeShipping?]
   compensations: voidPayment / releaseStock per step
   ```
2. **Persisted state machine:** `saga_instances(id, order_id, current_step, status, context jsonb, updated_at)` — resumable across restarts (phase-09 runner + a store)
3. **Timeout policy per step type** (payments 30s, inventory 10s) → timeout triggers the same compensation path as explicit failure
4. **Compensation execution:** reverse order, continue-on-compensation-failure with error collection, audit rows in `saga_log(saga_id, step, direction, outcome, detail)`
5. **Order status sync:** orchestrator emits order-service commands (`markPaid`, `markCancelled`) consumed like any other service

## Accept

- [ ] Payment-decline drill → payment.void skipped (never charged), stock released, order → `cancelled` with audit trail
- [ ] Timeout mid-reserve → release compensation fires; late success of the timed-out call is absorbed idempotently
- [ ] Restart the orchestrator mid-saga → resumes at current_step without re-executing completed steps
- [ ] Duplicate event delivery at ANY point changes no final state

## Resume line fed
*"Persisted saga orchestrator: declarative steps/compensations, timeout-driven unwind, crash-safe resume, duplicate-absorbing idempotency — proven by chaos drills."*
