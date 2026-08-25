# Flagship 1 — Webhook Delivery Platform

> **Est:** 60–90 hours across phases 06–10 · **Build guide:** session-by-session milestones below
> **Why this project:** it is a *distributed-systems product*, not a CRUD app. Every interview question about reliability, idempotency, and multi-tenancy has a concrete answer living in this repo.

## What you're building (one paragraph)

A multi-tenant service that receives events via API (or Kafka) and reliably delivers signed HTTP webhooks to customer-configured endpoints: automatic retries with exponential backoff, dead-letter queues after exhaustion, delivery logs with redrives, HMAC payload signing, endpoint health tracking, and per-tenant rate quotas. Think "build Svix/Webhook.site's engine." You'll also ship a React dashboard (your superpower) showing live delivery streams.

## Architecture sketch

```
 producers ──▶ POST /ingest ──▶ validation ──▶ fan-out planner
                                   │                    │
                              idempotency            Kafka topic:
                              keys store             webhook.deliver
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                                  delivery workers                DLQ consumer
                                  (pool, backoff,                 (park + alert +
                                   HMAC signing)                   redrive API)
                                        │                               │
                                        ▼                               ▼
                                 customer endpoints ◀── LocalStack SNS/SQS paths
                                        │
                                   result log ──▶ Postgres (delivery_attempts)
                                                        │
                                              React dashboard ◀── SSE live feed
```

## Milestone plan

| M | Deliverable | Phase gate |
|---|---|---|
| 0 | Design doc: delivery-semantics decisions, data model ERD, failure-mode table | 05 |
| 1 | Ingest API: tenant auth, schema validation, idempotency keys (Redis+PG dual guard), OpenAPI docs | 02–03 |
| 2 | Storage & fan-out: endpoints registry, event → per-endpoint delivery jobs (BullMQ first) | 03/06 |
| 3 | Delivery worker v1: timeout budget, exponential backoff + jitter, attempt logging | 01/06 |
| 4 | Reliability pack: DLQ after N attempts, redrive endpoint, circuit-breaker per endpoint health | 06 |
| 5 | Scale path: swap BullMQ→Kafka behind an interface; partition strategy doc | 06 |
| 6 | AWS mode: SQS/SNS/Lambda consumers via **LocalStack** profiles in docker-compose | 07 |
| 7 | Observability: pino correlation ids end-to-end, OTel traces ingest→delivery, Grafana board (success ratio, retry depth, DLQ rate) | 08 |
| 8 | Security pass: HMAC signing + secret rotation, SSRF guards on endpoint URLs, OWASP self-audit | 08 |
| 9 | Dashboard (React): endpoint CRUD, live SSE delivery feed, replay buttons, charts from metrics API | anytime — your edge |
| 10 | Load report + chaos drill: kill PG mid-retry-storm; k6 1k rps ingest; publish numbers | 04/07 |

## The decisions you must be able to defend

1. At-least-once delivery ⇒ consumers idempotent — WHERE exactly is that enforced?
2. Why backoff+jitter beats plain backoff (thundering herd math).
3. Idempotency window trade-offs (24h? why not forever? storage cost vs replay risk).
4. Partition key choice for Kafka ordering-per-endpoint guarantees.
5. Circuit breaker thresholds: what opens, what half-opens, who resets.

## Definition of done (resume-grade bar)

- [ ] CI green with ≥75% coverage incl. retry/backoff/DLQ branches
- [ ] `docker compose up` runs everything incl. LocalStack profile; seed script demos a full delivery + failure + redrive story
- [ ] Docs: architecture.md, decisions.md (ADR-style), runbook.md (what breaks at 3am)
- [ ] Committed evidence: k6 report, trace screenshots, chaos-drill notes
- [ ] Blog-post outline drafted ("Designing idempotent webhook delivery") — publishing doubles resume value

**Resume bullet shape:** *"Built multi-tenant webhook delivery platform (NestJS/Kafka/Postgres/LocalStack): idempotent ingestion, exponential-backoff retries w/ DLQ+redrive, HMAC-signed payloads, OTel-traced deliveries; sustained 1k rps ingest in committed load tests; React ops dashboard over SSE."*
