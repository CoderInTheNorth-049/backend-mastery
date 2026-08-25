# Flagship 2 — Milestone 5: CQRS read model

> **Unlocked by:** phase 06/08 · **Est:** 10–14 hours

## Goal

Order-history queries served from a denormalized `order_view` maintained by an incremental projector consuming the SAME events the saga emits — with staleness exposed as a metric, not a secret.

## Work items

1. **Read store:** separate Postgres database (true separation) with `order_view(order_id pk, user_id, status, total_cents, items jsonb, updated_at)` + projector watermark table
2. **Projector service:** consumes `orders.events` (+ payments/inventory events that affect display, e.g. payment.settled) → folds into order_view (phase-09 fold pattern, multi-stream edition)
3. **Query API:** `GET /orders-view?userId=…&status=…&cursor=…` — reads ONLY from the view; never touches write tables
4. **Staleness surface:** `/stats/lag` returns events-behind + seconds-lag; SLO documented ("view lags ≤5s p95")

## Accept

- [ ] Place an order → view updates within the lag SLO without any write-path change
- [ ] Kill the projector for a minute → backlog drains, no missed events (watermark proof)
- [ ] Replaying the topic from earliest → identical view state (idempotent fold proven)

## Resume line fed
*"CQRS read models fed by Kafka projections with watermarked incremental folds and exposed staleness SLOs."*
