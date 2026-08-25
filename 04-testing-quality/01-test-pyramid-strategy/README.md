# Topic: The test pyramid & how runners actually work

> **Goal:** Internalize the pyramid by building its engine. After implementing `describe/it/hooks` yourself, "why is my beforeEach running twice" becomes a question you answer from first principles.

## Beginner-friendly picks

- 🎥 YouTube search: **“test pyramid explained”** — multiple good visual walkthroughs
- 📝 [Kent C. Dodds — testing blog posts](https://kentcdodds.com/blog?q=test) — the why-behind-the-how classics

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Pyramid economics | many fast unit tests, fewer integration, few E2E — cost/confidence per test drives shape | [Google Testing Blog — Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html) · [Martin Fowler — pyramid](https://martinfowler.com/bliki/TestPyramid.html) |
| Runner mechanics | registration phase vs execution phase; hook scoping & ordering; sequential-by-default rationale | your assignment |
| AAA pattern | arrange/act/assert discipline; one behavior per test | [Jimmy Bogard — writing testable code](https://lostechies.com/jimmybogard/) (search his testing posts) |
| Test factories | builder functions over copy-paste fixtures; mother-object pattern | [Kent C. Dodds — AHA testing](https://kentcdodds.com/calls/01-04-2020/aha-testing) |
| Flaky tests | causes (time, order, network, shared state); quarantine vs fix; why retries hide disease | [Google — flaky tests](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) |
| What to NOT test | framework internals, pure wiring, generated code — coverage vanity vs signal | Testing Library principles |

## Keep in mind

- **Registration is synchronous tree-building; execution is a traversal.** Every weird hook bug you've hit lives in that distinction.
- **beforeEach chains run root→leaf; afterEach runs leaf→root** — symmetric with construction/destruction. Get it wrong and teardown depends on setup it shouldn't.
- **A failing test must never prevent siblings from running** — runners isolate errors per test precisely so one red doesn't hide five more.
- **Flaky tests are bugs**, not weather. Retries convert signal into noise; quarantine WITH a ticket converts noise into tracked debt.
- **Fast feedback is the feature**: if your unit suite exceeds ~30s, people context-switch mid-run and stop running it.

## Self-check quiz

<details><summary>1. Why do runners execute tests sequentially by default instead of parallelizing within a file?</summary>
Shared module state, singletons, ports, filesystem — intra-file isolation is expensive to guarantee. Parallelism happens ACROSS files/processes where state boundaries already exist.</details>

<details><summary>2. A test passes alone but fails in the full run. Top three suspects?</summary>
Leaked shared state (module singletons, DB rows), inter-test ordering assumptions, global timers/env pollution. Run with no-isolate/seed shuffling to surface.</details>

<details><summary>3. Your teammate adds retry(3) to every flaky spec. Good move?</summary>
No — it hides real nondeterminism until it detonates in prod. Quarantine + root-cause: time injection, state reset, or explicit contract for the racy dependency.</details>

<details><summary>4. Where do integration tests live on the pyramid and what justifies their cost?</summary>
Middle band: exercise REAL collaborators (DB, HTTP boundary) without UI. Justified when mocks would only assert your own assumptions — the classic "mocks lie" zone (next topic).</details>

## Assignment

[assignment.md](assignment.md) — implement `runTests()`: registration, nested suites, ordered hooks, async support, per-test error isolation, and a summary report. The spec treats your runner exactly like vitest treats yours.
