# Incident timeline — SEV1: Checkout outage, 2026-11-03 (fictional)

> All times UTC. Source: alerting system + deploy logs + support tickets.

## Background

- Service: checkout API (NestJS), Postgres primary + 2 replicas, pgbouncer pool (pool_size 20 per pod, 12 pods)
- Deploy `v2.14.0` shipped at **02:05** — added a “recommended products” call to the checkout response path
- SLO: 99.9% availability; alerting: 5xx rate > 5% for 5m pages @checkout-oncall

## Timeline

| Time (UTC) | Event |
|---|---|
| 02:05 | v2.14.0 rollout completes across 12 pods (rolling, maxUnavailable=0) |
| 02:07 | Recommended-products service starts timing out (its own DB was migrated 30 min earlier by another team) |
| 02:09 | Checkout pods hold sockets open awaiting recommendations; pgbouncer pool saturates; new checkout queries queue |
| **02:14** | PagerDuty fires to @checkout-oncall — 5xx rate 38% |
| 02:16 | First user reports arrive via support chat (“can’t pay”) |
| 02:18 | IC declared (@maya). @sam investigates; @lee takes comms |
| 02:26 | Investigator correlates error spike with v2.14.0 feature flag `reco_enabled` (default ON) |
| 02:29 | Mitigation: flag flipped OFF via config service — no redeploy needed |
| 02:31 | Error rate back < 0.5%; pools drain |
| **02:33** | Incident resolved (declared) — total customer-visible impact window **28 minutes** from first 5xx |
| 02:40 | IC calls for postmortem doc within 48h |

## Impact numbers (extract these!)

- Duration of customer impact: **28 minutes** (02:05→02:33)
- Peak 5xx rate during incident: **38%**
- Failed checkout attempts: ~**4,100**
- Estimated affected unique users: ~**2,900**
- Revenue impact: ~**$61k** in uncompleted orders

## Contributing facts scattered for your postmortem

- The reco-service migration by the OTHER team finished at 01:35 with no shared announcement
- v2.14.0 had no timeout configured on the recommendations HTTP client (defaults to none)
- No integration test covered “recommendations service unreachable” during checkout
- Flag existed and worked — mitigation took 4 minutes once correlated
- On-call had NO dashboard showing cross-service dependency latency; correlation took 12 minutes
