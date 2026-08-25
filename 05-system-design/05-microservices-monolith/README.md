# Topic: Microservices vs monolith — the boundary decision

> **Goal:** Earn the right to split a service. You'll write a real Architecture Decision Record for extracting one — including the option everyone skips: doing nothing.

## Beginner-friendly picks

- 🎥 Gaurav Sen — monolith vs microservices videos
- 📝 [microservices.io — pattern catalog browsing session](https://microservices.io/patterns/index.html) — skim names first, depth later

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Monolith-first | ship a modular monolith, extract when pain signals appear — not at idea zero | [Fowler — MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) |
| Modular monolith | module boundaries enforced by tooling/tests, single deploy unit; the underrated default | [Modular Monoliths primer](https://www.kamilgrzybek.com/design/modular-monolith-primer/) (free) |
| Extraction triggers | divergent scaling needs, independent deploy cadence per TEAM, distinct data lifecycles — NOT "microservices are modern" | [Fowler — microservices trade-offs](https://martinfowler.com/articles/microservices.html) |
| Data ownership | one writer per data; shared DB = distributed monolith with extra steps | [microservices.io — database per service](https://microservices.io/patterns/data/database-per-service.html) |
| The new taxes | network failures as first-class, eventual consistency everywhere you cross lines, observability across hops, contract management | microservices.io saga/transaction pages |
| Strangler fig | extract behind a facade route-by-route; old code dies by attrition, never big-bang | [Fowler — strangler fig](https://martinfowler.com/bliki/StranglerFigApplication.html) |

## Keep in mind

- **Conway's law is the real spec**: service boundaries that don't match team boundaries get re-merged socially if not technically.
- **Count the hops before you cut**: every user flow crossing N services inherits N availability multipliers and N latency adds.
- **A shared library is often the right "integration"** — extraction is for independent LIFECYCLE, not code reuse.
- **The modular monolith is reversible; premature microservices are usually not** (data has already scattered).
- If you cannot draw the data-ownership diagram, you're not ready to extract anything.

## Self-check quiz

<details><summary>1. Two services share one Postgres database. What are they really?</summary>
A distributed monolith: schema coupling means neither can deploy independently — worst of both worlds. Either split the data or re-merge the services.</details>

<details><summary>2. Name three legitimate extraction triggers and two anti-triggers.</summary>
Triggers: different scaling profiles, separate deploy teams/cadence, regulatory/data isolation. Anti-triggers: "it might scale someday", "the codebase feels big".</details>

<details><summary>3. Your extracted service needs data owned by the monolith. Options ranked?</summary>
(1) API call for sync reads w/ caching; (2) event-fed local read replica (CDC/outbox); (3) direct DB access — never; it re-couples you invisibly.</details>

<details><summary>4. What does strangler-fig give you that big-bang rewrite doesn't?</summary>
Continuous shippability + instant rollback per route; value flows while migration runs. Big-bank rewrites die in a two-year dark valley with a heroic cutover.</details>

## Assignment — written deliverable `adr-001-feed-service.md`

Scenario (invent freely within it): **RecipeShare** — a modular monolith (NestJS + Postgres) with modules: users, recipes, social-graph, feed-ranking, notifications, moderation. Feed generation now takes p95 900ms at peak because ranking queries fight recipe writes for the same tables; the platform team ships weekly, the ML folks want daily feed-model deploys.

Write an ADR using this structure (also the template for flagship design docs):

1. **Status / Context** — facts + pressures above, quantified
2. **Decision** — one sentence
3. **Options considered** (≥3, must include "do nothing / tune indexes") with pros+cons each
4. **Consequences** — positive AND negative, incl. consistency model you now own
5. **Migration plan** — strangler steps: facade route, event backfill, dual-read verification, cutover, decommission
6. **Rollback story**

Self-score /20 on the rubric below; commit at ≥16.

### Rubric

| Criterion | Points |
|---|---|
| Context quantifies the pain (numbers, not adjectives) | /3 |
| "Do nothing" option argued seriously with data | /3 |
| Chosen option names its data-ownership change explicitly | /4 |
| Consistency model of the NEW system stated (what goes eventual) | /4 |
| Migration is strangler-shaped: verifiable steps, each independently revertible | /4 |
| Rollback story handles the backfill window, not just cutover | /2 |
