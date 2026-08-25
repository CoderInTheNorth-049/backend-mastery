# Build guide — Capstone 1: URL Shortener (full)

> **When:** starts after phase 02, grows through phase 08 · **Est:** 25–35 hours total
> Companion: [project-brief.md](project-brief.md) · your phase-05 design doc becomes M0's output.

## Target architecture

```
 React dashboard ──┐
                   ▼
        L7 LB / reverse proxy
                   │
        NestJS API ────────▶ PostgreSQL (links, click aggregates)
             │      │                    ▲
             │      └─ BullMQ producer ─▶ Redis queue ─▶ click-ingest worker
             │
             ├─ GET /:code hot path: Redis cache-aside (jittered TTL)
             └─ pino logs · Prometheus metrics · OTel traces
```

---

## M0 — Design doc (½ day)

Write the phase-05 prompt `01-url-shortener.md` answer on [template](../../05-system-design/07-classic-designs/template.md).

**DoD:** rubric ≥19/25 · diagram passes `validateMermaid` · collision math for your alphabet shown · committed to `docs/design.md`.

## M1 — Core API skeleton (2 days)

```bash
pnpm dlx @nestjs/cli new url-shortener --strict
pnpm add @prisma/client && pnpm add -D prisma
```

Build:

1. `POST /links {url}` → `{code}` · `GET /:code` → 302
2. Base62 codes from counter+random hybrid — document collision strategy in code comments
3. Validation: URL scheme allowlist (http/https only), max length → RFC 9457 error envelope
4. `@nestjs/swagger` OpenAPI at `/docs`
5. Split health endpoints: `/healthz` liveness vs `/readyz` checks DB

**Accept:** supertest suite green — happy path, invalid URL 400, unknown code 404 JSON, redirect sets explicit Cache-Control.

## M2 — Persistence & migrations (2 days)

1. Prisma schema: `Link(id, code @unique, targetUrl, createdAt, expiresAt?, disabledAt?)`
2. Practice real migrations: `prisma migrate dev` locally, commit migration SQL
3. Redirect query selects ONLY needed columns (`select: { targetUrl: true }`)

**Accept:** fresh clone → `docker compose up` + `migrate deploy` boots working API; CI runs `migrate deploy` against an empty DB before tests.

## M3 — Click analytics off the hot path (2–3 days)

The senior move: redirects NEVER await DB writes.

1. On redirect: enqueue `{eventId, code, ts, uaHash, country?}` to BullMQ — fire-and-forget with `.catch(log)` so queue hiccups can't break redirects
2. Worker consumes in batches (phase-01 pool discipline) → bulk-inserts into `clicks`
3. `GET /links/:code/stats` reads pre-aggregated counts (SQL GROUP BY), never raw row scans
4. Dedupe by `eventId` in worker (phase-06 inbox preview)

**Accept:**
- k6 smoke DURING writes: redirect p95 unchanged vs baseline (commit both numbers)
- Stats endpoint is eventually-consistent BY DESIGN — you can state the bound aloud

## M4 — Cache layer (2 days)

1. Redis cache-aside on `GET /:code`: key `v1|link|code=<code>` (your `buildCacheKey` format!), TTL via jittered ±10% around 300s
2. DEL cache key when a link is edited/disabled — invalidate AFTER DB commit
3. Negative caching for unknown codes (`"null"` entries, shorter TTL 30s) — bot-protection
4. Export hit-ratio gauge

**Accept:** k6 before/after shows cached p95 measurably lower; disabled links disappear within one TTL max; both reports committed to `reports/`.

## M5 — Load test & tune (2 days)

1. k6 scenarios: smoke (5 iters) + ramp targeting your laptop's honest ceiling
2. Find the FIRST bottleneck honestly (likely PG pool or JSON serialization) — change ONE thing, re-run, commit both reports with delta table
3. Threshold = your SLO: redirect p95 < 15ms local

**Accept:** `reports/load-before.md` + `load-after.md` with a delta table; spec/threshold breaches fail CI.

## M6 — Observability & polish (2 days)

1. pino structured logs w/ request-id middleware (phase-08 factory!) — never log full target URLs (PII)
2. `/metrics`: request histogram, cache hit ratio gauge, queue depth gauge
3. Grafana dashboard JSON committed; screenshot into README
4. React mini-dashboard (your edge): create-link form + live clicks chart over SSE
5. README: validated mermaid architecture diagram + decisions table + runbook (“slow at 3AM → check dashboards in this order”)

---

## Definition of done (whole capstone)

- [ ] CI green: lint/typecheck/tests, coverage ≥70% enforced
- [ ] One-command boot; seed script demos analytics end-to-end
- [ ] Load reports committed with analysis, not just screenshots
- [ ] Runbook section exists and references real dashboards
- [ ] Every resume bullet survives 10 minutes of follow-ups

**Resume bullet shape:**
*"URL shortener (NestJS/Postgres/Redis/BullMQ): queue-buffered click analytics off the redirect hot path, jittered-TTL cache-aside at p95 <15ms (k6-verified), OTel-traced; React ops dashboard."*
