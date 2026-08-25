# Topic: Metrics & Prometheus — numbers that page you

> **Goal:** Build the RED-metrics module every service needs (rate, errors, duration), render real Prometheus text format from a Registry, and understand what each scraped line means — by asserting on it character-by-character.

## Beginner-friendly picks

- 📝 [RED method article](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/) — the three metrics you're building
- 📝 [Brendan Gregg — USE method](http://www.brendangregg.com/usemethod.html) — the resource-side sibling

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Counters | only go UP (requests, errors); rate via `rate()` queries, never absolute deltas in dashboards | [prom-client — counter](https://github.com/siimon/prom-client#counter) |
| Gauges | current state (in-flight, queue depth); inc/dec/set | prom-client docs |
| Histograms | bucketed duration distributions → p50/p95/p99 server-side; buckets ARE the resolution contract | [prom-client — histogram](https://github.com/siimon/prom-client#histogram) |
| Text exposition format | `# HELP`/`# TYPE` headers; sample lines `name{label="v"} value`; what your scraper parses | [Prometheus — exposition](https://prometheus.io/docs/instrumenting/exposition_formats/) |
| The RED method | Rate, Errors, Duration per service endpoint — the minimum viable instrumentation | [Grafana — RED method](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/) |
| Cardinality danger | every label VALUE multiplies series; user-ids as labels = database death | [Prometheus — cardinality](https://prometheus.io/docs/practices/naming/) |

## Keep in mind

- **Route templates, not raw paths**: label `/users/42` explodes cardinality — use `/users/:id`.
- **Histogram buckets are chosen at instrument time**; wrong bounds make p95s lie forever. Default buckets rarely fit sub-ms or >10s latencies.
- **Counters reset on process restart** — dashboards must use rate/increase, and YOU must know why.
- **In-flight gauge pairs inc/dec in a finally** — leaks show up as ratcheting gauges.
- **Errors label with class** (`5xx`, `4xx`), not message — messages are logs' job.

## Self-check quiz

<details><summary>1. Why can't Prometheus tell you exact p99 from histograms?</summary>
Buckets store counts per range, not individual values. p99 interpolates within the containing bucket's bound — precision = bucket design.</details>

<details><summary>2. Your requests_total has 40k series. What did you do, and what breaks first?</summary>
High-cardinality labels (user ids, raw paths). Breaks: scrape size, memory, query speed — then the TSDB. Fix: template routes, drop volatile labels.</details>

<details><summary>3. Counter went DOWN between scrapes. Explain honestly.</summary>
Process restart (counter reset to 0). Clients handle it; your dashboard needs rate()/increase() which detect resets — absolute-delta math lies.</details>

## Assignment

[assignment.md](assignment.md) — implement `createHttpMetrics` (counter + histogram + in-flight gauge over an injectable Registry) and `renderMetrics`. Specs assert exact exposition-format lines.
