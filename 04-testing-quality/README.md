# Phase 04 — Testing & quality engineering (~3 weeks)

**Outcome:** stop being a *user* of test tooling and become someone who could build it. You'll implement a micro test-runner, own the database-lifecycle harness pattern, mock network boundaries with MSW, verify consumer contracts, load-test with k6 against a live server, and enforce quality gates in CI.

## Beginner-friendly picks

- 🎥 [Fireship — Testing series](https://www.youtube.com/@Fireship) — fast orientation: unit vs integration vs e2e
- 📝 [Testing Library — guiding principles](https://testing-library.com/docs/guiding-principles) — philosophy you'll reuse everywhere

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-test-pyramid-strategy](01-test-pyramid-strategy/) | 4 days | A working `describe/it/hooks` test-runner — vitest's skeleton, demystified |
| [02-integration-testcontainers](02-integration-testcontainers/) | 4 days | `DatabaseHarness`: idempotent lifecycle + reset discipline over real providers |
| [03-mocks-contracts](03-mocks-contracts/) | 4 days | MSW-tested API client w/ error taxonomy + a consumer-driven contract verifier |
| [04-load-testing-k6](04-load-testing-k6/) | 3 days | k6 smoke + stress scenarios, executed against a live server, thresholds asserted |
| [05-ci-quality-gates](05-ci-quality-gates/) | 2 days | A CI workflow file graded by structure + coverage thresholds wired into the pipeline |

## Why these five

Every senior interview loop touches them: "how do you keep suites fast but confident" (pyramid), "how do you test DB code" (harness), "when do mocks lie" (contracts), "how do you know it scales" (load), "what blocks a bad merge" (gates). This phase turns each from vocabulary into muscle memory.

## Anchor free resources

- [Vitest docs](https://vitest.dev/guide/) · [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles) · [Google Testing Blog — flaky tests](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- [MSW docs](https://mswjs.io/docs/) · [Testcontainers Node](https://node.testcontainers.org/)
- [k6 docs](https://grafana.com/docs/k6/latest/) · [k6 examples](https://grafana.com/docs/k6/latest/examples/)
- [GitHub Actions docs](https://docs.github.com/en/actions)

## Done means

- [ ] All five topics green (`pnpm test:solutions` verifies keys too)
- [ ] Your micro-runner passes its suite; you can explain hook ordering cold
- [ ] `pnpm lint` clean; CI runs lint + tests + coverage artifact
- [ ] You've watched your own stress-test hit a threshold and can narrate what broke first
