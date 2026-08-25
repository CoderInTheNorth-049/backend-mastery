# Topic: Load testing — find YOUR breaking point before users do

> **Goal:** Write k6 scenarios that encode SLOs as executable thresholds, run them against a live local server, and read the summary like an engineer — p95s and failure rates, not vibes.

## Beginner-friendly picks

- 🎥 [k6 (YouTube)](https://www.youtube.com/results?search_query=k6+load+testing+tutorial) — official + community walkthroughs
- 📝 [k6 — test types guide](https://grafana.com/docs/k6/latest/testing-guides/test-types/) — smoke/load/stress/spike taxonomy you're implementing

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| VU model | k6 concurrency = virtual users looping your scenario; RPS is an OUTCOME, not a dial | [k6 — VUs](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/) |
| Test taxonomy | smoke (tiny sanity) → load (expected peak) → stress (find the cliff) → spike (sudden bursts) | [k6 — test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/) |
| Thresholds | pass/fail criteria attached to metrics (`p(95)<800`) — turn load runs into CI gates | [k6 — thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/) |
| Percentiles over averages | averages hide the tail where rage lives; p95/p99 are the contract | [Gil Tene on latency percentiles](https://www.youtube.com/watch?v=lJ8ydIuPFeU) (classic talk) |
| Reading summaries | http_req_duration bands, checks rate, reqs/sec trajectory across stages | [k6 — results output](https://grafana.com/docs/k6/latest/results-output/end-of-test-summary-statistics/) |

## Keep in mind

- **A passing load test only means "within THESE thresholds."** Declare thresholds from product SLOs, otherwise green means nothing.
- **Your laptop is not prod.** Absolute numbers transfer poorly; RELATIVE comparisons (before/after a change) are the durable value.
- **Warmup matters**: first-second numbers include JIT/TLS/cache-cold noise; ramp stages exist partly to discard it.
- **The client can be the bottleneck** — saturating one CPU core with TLS before the server sweats. Watch `data_sent`/`vus` actually ramp.
- **Threshold breach = non-zero exit code.** That's the hook CI uses; your assignment exploits exactly this.

## Self-check quiz

<details><summary>1. Why does 200 rps from one machine ≠ capacity of 200 rps?</summary>
Single-box limits (CPU, ephemeral ports, bandwidth) may cap the CLIENT first; network path differs from prod; VU pacing distorts arrival patterns. Treat as comparative signal.</details>

<details><summary>2. avg 80ms but p99 = 2s. User experience?</summary>
Roughly 1-in-100 requests takes 2s+ — for a page making 20 calls, ~18% of page loads eat one. Averages are marketing; percentiles are truth.</details>

<details><summary>3. Your stress test's error rate jumps at vus=40 while CPU sits at 30%. First suspects?</summary>
Connection/thread pool exhaustion (server or DB), lock queues, backlogs — saturation without CPU means WAITING somewhere. Check pool metrics & event-loop lag next.</details>

## Assignment

[assignment.md](assignment.md) — write `smoke.js` + `stress.js` (env-driven stage durations so CI can shrink them), then watch both execute against a live local server; the spec enforces your own declared thresholds.
