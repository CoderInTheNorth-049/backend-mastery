# Topic: Mocks & contracts — controlling the boundary

> **Goal:** Test everything your code does at the HTTP edge without a real partner service: deterministic success/error/timeout paths via MSW, then formalize "what we expect from providers" as an executable consumer contract.

## Beginner-friendly picks

- 📝 [MSW — Why MSW?](https://mswjs.io/docs/best-practices/) — the boundary-mocking argument in two pages
- 🎥 YouTube search: **“consumer driven contract testing”** — Pact-flavored explainers

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Mocking at the boundary | intercept NETWORK (MSW) vs mocking fetch fns — why network-level catches accidental real calls | [MSW — getting started](https://mswjs.io/docs/getting-started) |
| Error taxonomy design | one typed `ApiError` with stable `code`s beats string-matching messages across your codebase | your assignment |
| Timeouts are behavior | unbounded upstream calls are outages-in-waiting; test the timeout path like any feature | [MDN — AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout) |
| Consumer-driven contracts | provider breaks you in prod vs contract suite breaking CI — shift-left compatibility | [Pact docs — how Pact works](https://docs.pact.io/introduction/how-pact-works) (concepts free) |
| When mocks lie | mocks encode YOUR assumptions; only integration/contract tests catch drift on the OTHER side | [Martin Fowler — mocks aren't stubs](https://martinfowler.com/articles/mocksArentStubs.html) |
| Response-shape tolerance | unknown extra fields ≠ violation; missing/type-broken known fields = violation | assignment's verifier rules |

## Keep in mind

- **`onUnhandledRequest: 'error'` is your safety net** — it converts forgotten routes into loud failures instead of silently hitting the internet.
- **Timeout errors have platform names** (`TimeoutError`/`AbortError` DOMExceptions) that vary by runtime — normalize into your own taxonomy at the client edge, once.
- **Contracts check STRUCTURE, not values**: amounts change constantly; "amount must be a number" never does. Value assertions belong to the consumer's own unit tests.
- **Tolerant reader principle**: ignoring unknown fields is what lets providers evolve without breaking every consumer — enforce presence/types only.
- The verifier you build here is Pact's core loop in miniature: expectations live WITH the consumer, run WITHOUT the provider.

## Self-check quiz

<details><summary>1. Your client retries 5xx automatically. Where should retry logic NOT live?</summary>
Inside the mock/handler layer. Handlers simulate the PROVIDER; policy (retries, backoff) is YOUR client's behavior and must be asserted through the mock, not implemented by it.</details>

<details><summary>2. Provider adds a new response field. Contract suite fails. What's wrong?</summary>
Your contract was written as strict-equality instead of tolerant-reader (presence+type of KNOWN fields). Fix the verifier semantics, not the provider.</details>

<details><summary>3. Why normalize AbortError into ApiError('timeout') at the client boundary?</summary>
Callers shouldn't branch on platform-specific DOMException names that differ across Node/browser/undici versions. One taxonomy = one catch-site upstream.</details>

<details><summary>4. When do you graduate from MSW mocks to a contract test or sandbox integration?</summary>
When the cost of being wrong exceeds the cost of the slower test: auth flows, idempotency semantics, header quirks — anything where the provider's REAL quirks carry business risk.</details>

## Assignment

[assignment.md](assignment.md) — two graded pieces: a `PaymentsApiClient` exercised through MSW (happy/validation/server/not-found/timeout/network/malformed), and `verifyContract()` enforcing a charge contract against given provider responses with exact violation reporting.
