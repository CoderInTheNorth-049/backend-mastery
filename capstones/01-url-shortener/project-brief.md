# Capstone 1 — URL Shortener (with teeth)

> **When:** after Phase 02 · **Est:** ~25–35 hours · **Brief status:** full build guide ships with phase 05 (system-design tie-in). Start building the core now; revisit for analytics/caching upgrades as phases unlock.

Everyone *has* a URL shortener. Yours will demonstrate production thinking that most don't:

## Core (phase 02–03 skills)

1. NestJS service: `POST /links` `{url}` → `{code}`, `GET /:code` → 302
2. Postgres + Prisma persistence; unique short-code generation (base62, collision strategy documented)
3. Input validation incl. SSRF-safe URL checks; OpenAPI docs auto-generated

## Production layers (added as phases progress)

| Upgrade | Phase unlocked |
|---|---|
| Vitest + supertest suite ≥70%, CI badge | 04 |
| Redis cache-aside on redirect path + invalidation on edit | 05 (caching topic) |
| Click-analytics events → queue consumer → aggregates (no sync writes on hot path) | 06 |
| Dockerfile + docker-compose (app/pg/redis); deploy to kind | 07 |
| pino request logs w/ correlation ids; Prometheus counters/histograms per redirect | 08 |
| Design-doc README: capacity math, cache-hit projections, failure modes | 05 |

## Non-negotiable definition of done

- [ ] Redirect p95 < 15ms local (k6 report committed)
- [ ] No sync DB write on GET /:code hot path
- [ ] Architecture diagram + decisions table in README
- [ ] Interview-ready: you can defend code alphabet choice, TTLs, and analytics pipeline in 10 minutes of follow-ups

**Resume bullet shape:** *"URL shortener (NestJS/Postgres/Redis): queue-buffered click analytics, cache-aside redirects at p95 <15ms (k6-verified), CI-enforced 75% coverage."*
