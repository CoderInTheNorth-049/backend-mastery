# Topic: Integration testing with real databases — the harness pattern

> **Goal:** Own the lifecycle every integration suite secretly needs: provision a throwaway database, apply schema, reset between tests, tear down cleanly — idempotently, even when tests fail mid-flight. You built the pieces in phase 03; here you package them into the reusable `DatabaseHarness`.

## Beginner-friendly picks

- 🎥 [Testcontainers (YouTube)](https://www.youtube.com/@testcontainers) — official shorts on the patterns you're implementing
- 📝 [Testcontainers Node — quickstart](https://node.testcontainers.org/quickstart/) — skim BEFORE reading providers.ts; the vocabulary matches

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Suite-scoped databases | one DB per FILE (not per test): fast enough, isolated enough; per-test = reset() | [Testcontainers — concepts](https://java.testcontainers.org/test_framework_integration/manual_lifecycle_control/) |
| Idempotent lifecycle | double-start/double-stop MUST be no-ops — suites crash mid-teardown all the time | your assignment |
| Reset strategies | TRUNCATE … RESTART IDENTITY vs drop/create; why resets beat re-provisioning | phase 03 recap |
| Provider abstraction | env URL → Docker → embedded: same tests, three environments | [src/providers.ts](src/providers.ts) — PROVIDED, read it |
| Coalesced startup | concurrent first-starts share ONE initialization promise (race discipline) | your assignment |

## Keep in mind

- **Never let tests bind fixed ports or share global state** — parallel workers multiply every sin.
- **TRUNCATE is transactional in Postgres** — resets can ride inside transactions safely (unlike MySQL).
- **Explicit-id fixture inserts don't advance sequences** (phase-03 gotcha returns here as a real bug if you forget).
- **A stopped harness must say so loudly** — silent post-stop queries produce maddening flakes.

## Self-check quiz

<details><summary>1. Why reset() instead of dropping/recreating tables between tests?</summary>
Reset is milliseconds (TRUNCATE) vs hundreds of ms for DDL churn + provider round-trips. Schema stays; data goes.</details>

<details><summary>2. Two spec files start harnesses simultaneously. What breaks without coalescing?</summary>
Two containers/embedded instances racing for the same port and data dir — or doubled cost at best. A shared startup promise admits exactly one initializer.</details>

<details><summary>3. Where do fixtures fit: beforeAll or beforeEach?</summary>
Schema once (beforeAll); DATA per-test (beforeEach + reset). Mixing them up = order-dependent suites.</details>

## Assignment

[assignment.md](assignment.md) — implement `DatabaseHarness` with unit tests against a FAKE provider (lifecycle discipline, always runnable) plus integration tests against a REAL selected provider.
