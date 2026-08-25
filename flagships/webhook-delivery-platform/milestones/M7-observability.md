# Flagship 1 — Milestone 7: Observability

> **Unlocked by:** phase 08 · **Est:** 10–14 hours
> (Numbering note: the brief's "AWS mode" guide lives at [M7-aws-mode.md](M7-aws-mode.md) — this file covers brief-M7, observability.)

## Goal

You should be able to answer “is delivery healthy RIGHT NOW, and which tenant is degraded?” from dashboards alone — and replay any single delivery's life from one trace id.

## Work items

1. **Structured logs (pino):** every log line carries tenantId, eventId, endpointId, attempt; secrets/payloads redacted by path
2. **Metrics (Prometheus):**
   - `webhook_deliveries_total{tenant,status}` counter
   - `webhook_delivery_duration_seconds` histogram per endpoint class
   - `webhook_dlq_depth`, `webhook_breaker_open`, consumer lag gauge
3. **Tracing (OTel):** one trace spanning ingest → fan-out → each delivery attempt; child spans carry http attrs; gen-ai conventions not needed here but span naming follows semconv style
4. **Grafana board JSON committed:** success-ratio SLO panel, retry-depth heatmap, DLQ rate, breaker states, per-tenant filter variable
5. **SLO declaration:** 99% of deliveries either succeed or reach DLQ within 24h — with a burn-rate alert wired to your phase-08 math

## Accept

- [ ] From ONE eventId you can pull: its trace, all attempts, final status — in under a minute (screenshot committed)
- [ ] Dashboard answers "which tenants have breakers open?" at a glance
- [ ] Burn-rate alert fires in a scripted slow-failure drill

## Resume line fed
*"Full observability: OTel traces spanning ingest→delivery attempts, RED metrics with per-tenant slicing, SLO burn-rate alerts on Grafana boards."*
