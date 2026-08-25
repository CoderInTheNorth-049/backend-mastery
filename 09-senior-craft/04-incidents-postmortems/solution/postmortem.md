# Postmortem: Checkout outage — 2026-11-03

**Severity:** SEV1 · **Status:** draft · **IC:** @maya · **Author:** me

## 1. Summary
At 02:05 UTC a checkout deploy (v2.14.0) enabled synchronous recommendations calls whose downstream dependency was silently migrated 30 minutes earlier. Unbounded HTTP waits exhausted the DB connection pool within minutes, producing 38% 5xx at peak for a customer-visible window of 28 minutes (~4,100 failed checkouts, ~$61k). Mitigation was fast once correlated — flipping the `reco_enabled` flag at 02:29 restored service by 02:31–02:33.

## 2. Impact
- Duration of customer impact: 28 minutes (first 5xx 02:05 → resolved 02:33)
- Failed checkout attempts: ~4,100; affected unique users: ~2,900
- Revenue impact: ~$61k uncompleted orders
- Detection lag: users reported issues (02:16) before our alert fired (02:14 alert actually preceded reports but correlation took until 02:26)

## 3. Timeline (UTC)
| Time | Event |
|---|---|
| 01:35 | Recommendations-service DB migration completes (other team, unannounced) |
| 02:05 | v2.14.0 rollout completes; reco_enabled flag ON |
| 02:09 | Pool exhaustion begins; checkout queries queue |
| 02:14 | PagerDuty pages on-call (5xx 38%) |
| 02:16 | First support tickets |
| 02:18 | IC declared; roles split |
| 02:26 | Correlated spike to v2.14.0 / reco flag |
| 02:29 | Flag OFF |
| 02:33 | Resolved |

## 4. Contributing factors
1. No timeout configured on the recommendations HTTP client — unbounded waits held pool sockets.
2. Flag defaulted ON with no canary/cohort exposure for a new synchronous dependency.
3. Cross-team migration had no announcement into the deploy-freeze/change channel.
4. No integration test covering "recommendations unreachable during checkout".
5. No cross-service dependency-latency dashboard; correlation cost 12 minutes.
6. Pool saturation had no early-warning alert (only user-facing 5xx alerted).

## 5. What went well / poorly
Well: feature-flag mitigation avoided a risky rollback under pressure; roles were declared quickly; flag infrastructure worked as designed.
Poorly: dependency coupling discovered in production; detection relied on symptoms not leading indicators; two teams' changes interacted invisibly.

## 6. Action items
| # | Action | Owner | Priority | Due | Verifiable how? |
|---|---|---|---|---|---|
| 1 | Add 250ms timeout + circuit breaker to reco client | @sam | P0 | Nov 10 | unit spec asserting abort; chaos drill |
| 2 | Default new sync dependencies to flag-OFF + 5% canary | @maya | P0 | Nov 17 | deploy checklist updated & audited next release |
| 3 | Contract test: checkout works with reco unreachable | @lee | P1 | Nov 14 | CI test added and failing pre-fix (repro commit) |
| 4 | Dependency-latency dashboard + pool-utilization alert | @infra | P1 | Nov 20 | dashboard linked in runbook; alert fires in game-day |

## 7. Lessons learned
Synchronous convenience calls become availability couplings — every new cross-service call needs a timeout, an off-switch, and a test proving the off-path works. Cross-team migrations need a shared announcement surface; silent change plus silent failure equals SEV1.
