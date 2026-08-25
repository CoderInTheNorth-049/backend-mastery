# Phase 08 — Observability & security (~4 weeks)

**Outcome:** instrument like an SRE and harden like an attacker is watching. Structured logs with redaction, Prometheus metrics in text format, OTel span trees asserted via in-memory exporters, error-budget math, exploit-fix OWASP labs against your own API patterns, and a secret scanner you write yourself.

## Beginner-friendly picks

- 🎥 [Dotconferences/Google SRE talks](https://www.youtube.com/@GoogleSRE) — SLO culture talks worth subscribing for
- 📝 [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — the fix-side encyclopedia your labs reference

## How this phase verifies — everything runs offline

| Topic | Grading mechanism |
|---|---|
| [01-structured-logging](01-structured-logging/) | pino → captured stream; specs parse JSON lines (shape, redaction, correlation) |
| [02-metrics-prometheus](02-metrics-prometheus/) | prom-client Registry rendered to text format; sample lines regex-asserted |
| [03-tracing-otel](03-tracing-otel/) | InMemorySpanExporter + SimpleSpanProcessor: span trees, parent ids, error status |
| [04-slos-alerting](04-slos-alerting/) | error-budget math as pure functions |
| [05-appsec-owasp](05-appsec-owasp/) | **exploit-fix pairs**: vulnerable reference code verified broken, YOUR defenses verified holding |
| [06-secrets-supply-chain](06-secrets-supply-chain/) | gitleaks-style diff scanner you implement, against fixture diffs |

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-structured-logging](01-structured-logging/) | 3 days | Logger factory: redaction paths, request-id children, level policy |
| [02-metrics-prometheus](02-metrics-prometheus/) | 3 days | RED metrics module (counter/histogram/gauge) rendering real text format |
| [03-tracing-otel](03-tracing-otel/) | 5 days | Instrumented checkout flow: parent/child spans + error recording |
| [04-slos-alerting](04-slos-alerting/) | 2 days | Budget math + burn-rate alert predicate |
| [05-appsec-owasp](05-appsec-owasp/) | 6 days | Defenses vs the three classic flaws: SQLi, IDOR, XSS |
| [06-secrets-supply-chain](06-secrets-supply-chain/) | 2 days | Diff secret-scanner |

Parallel track: capstone 1's M6 (observability) consumes topics 01–02 directly.

## Anchor free resources

- [pino docs](https://getpino.io/) · [prom-client](https://github.com/siimon/prom-client) · [OpenTelemetry JS docs](https://opentelemetry.io/docs/languages/js/)
- [Google SRE book (free)](https://sre.google/sre-book/table-of-contents/) · [The RED method](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) · [OWASP ASVS](https://owasp.org/asvs/) · [gitleaks](https://github.com/gitleaks/gitleaks)

## Done means

- [ ] All five coded topics green (`pnpm test:solutions` proves keys)
- [ ] You can explain liveness-vs-readiness AND log-level-vs-sample-rate as COST decisions
- [ ] Your defenses file blocks every attack the vulnerable reference demonstrates
