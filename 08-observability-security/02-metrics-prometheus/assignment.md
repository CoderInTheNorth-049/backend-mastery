# Assignment — RED metrics module

## The problem you're solving
Dashboards need three numbers per endpoint: how many requests (Rate), how many failed (Errors), how long they took (Duration) — plus what's currently in-flight. You'll build that module over prom-client and render REAL Prometheus exposition format, then assert on exact sample lines the way a scraper would parse them.

## Your tasks
Implement in [src/metrics.ts](src/metrics.ts):

1. **`createHttpMetrics(registry)`** registering:
   - counter `http_requests_total{method,route,status}`
   - histogram `http_request_duration_seconds{method,route}` with sub-second-friendly buckets
   - gauge `http_requests_inflight`
2. **`observeRequest(metrics, {method,route,status}, durationSeconds)`** — increments the counter, observes duration, nothing else.
3. **`renderMetrics(registry)`** — returns the Prometheus text format string.

## Definition of done
- [ ] Spec green: exact sample lines asserted (`http_requests_total{method="GET",route="/users/:id",status="200"} 2`), HELP/TYPE headers present, histogram `_sum/_count/_bucket` updated, gauge inc/dec visible, clean output with zero observations (no undefined/NaN)

## Hints (open only when stuck)

<details><summary>Label names</summary>
Declared once at metric creation via <code>labelNames</code>; values supplied per-observation. Status must be STRINGIFIED into labels.</details>

## Going further (optional)
Route-template middleware wrapper so Express handlers can't forget observation; document cardinality dangers in notes.

