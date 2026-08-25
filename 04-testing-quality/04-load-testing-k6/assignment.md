# Assignment — smoke + stress scenarios, executed for real

## The problem you're solving
“We support 10k users” is a guess until traffic proves it. You'll write two k6 scenarios — a tiny smoke run and a ramping stress test with SLO thresholds as pass/fail gates — then EXECUTE them against a live local server. When a threshold breaches, k6 exits non-zero and your spec fails: load testing as CI, not as vibes.

## Your tasks
Install once: `bash scripts/install-k6.sh` (→ `~/.local/bin`, no root). Then:

1. **[src/smoke.js](src/smoke.js)** — sanity scenario: `options = { vus: 1, iterations: 5 }`; target from `__ENV.BASE_URL` (default fallback allowed); default function GETs `/health` wrapped in `check(res, …)` asserting status 200.
2. **[src/stress.js](src/stress.js)** — ramping load:
   - `stages`: RAMP_UP → STEADY → RAMP_DOWN, all three durations read from `__ENV` (`RAMP_UP`/`STEADY`/`RAMP_DOWN`) with production defaults (e.g. 30s/60s/10s) — CI passes shrunken values
   - `TARGET_VUS` from env, default ≥ 10
   - `thresholds`: `http_req_duration p(95)<800` and `http_req_failed rate<0.05` — these ARE the SLO
   - default function hits `/work` (deliberately expensive endpoint) with a status check

## Definition of done
- [ ] Structure specs green (they parse your files even without k6 installed)
- [ ] Runtime specs green: smoke = exit 0, ≥5 requests, checks rate 100%; stress = exit 0 under shrunken durations (2s/2s/1s @8 VUs), >20 requests
- [ ] You've deliberately broken one threshold locally, watched the spec fail, then restored it

## Hints (open only when stuck)

<details><summary>check()</summary>
Import from "k6" — unchecked responses make the checks-rate assertion meaningless.</details>

<details><summary>Env values are strings</summary>
<code>target: Number(__ENV.TARGET_VUS || 10)</code>.</details>

## Going further (optional)
Add `spike.js` (0→50 VUs instantly for 10s) plus its structure test; export JSON summaries into `reports/` and link them in README.
