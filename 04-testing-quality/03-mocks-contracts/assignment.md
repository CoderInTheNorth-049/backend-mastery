# Assignment — API client under MSW + contract verifier

## The problem you're solving
Your platform talks to a payments provider over HTTP. When it fails — validation, outage, timeout, garbage JSON — your USERS see those failures. You'll build one typed client where every failure becomes a known `ApiError` code, tested entirely against MSW-mocked HTTP. Then you'll formalize what you EXPECT from that provider as an executable contract, so drift breaks CI instead of production.

## Your tasks
Implement both exports from [src/api-client.ts](src/api-client.ts):

1. **`PaymentsApiClient(baseUrl, {timeoutMs?, apiKey?})`**
   - `createCharge(input)` → POST `/v1/charges`, expects **201**
   - `getCharge(id)` → GET `/v1/charges/:id`, expects **200**
   - headers: `Content-Type: application/json`; plus `x-api-key` when configured
   - per-attempt timeout via AbortSignal when `timeoutMs` set
   - failure translation → `ApiError(code, message, status?)`: 400/422→`validation` (message from body.error.message), 404→`not-found`, other 4xx/5xx→`server`, timeout abort→`timeout` (/timed out/i), fetch rejection→`network`, unparseable 2xx body→`server` matching /malformed/i
2. **`verifyContract(actual, contract)`** — tolerant-reader checker with EXACT messages:
   - status mismatch → `` `status: expected ${expected}, got ${actual}` ``
   - missing required field → `` `body.customer.email: missing` `` (dotted paths)
   - type mismatch → `` `body.amount_cents: expected number, got string` ``
   - nested contracts recurse (`status`+`body` marks one); optional fields may be absent; UNKNOWN fields ignored; null counts as missing

## Definition of done
- [ ] Both spec files green (`pnpm test:topic 04-testing-quality/03-mocks-contracts`)
- [ ] Zero unhandled MSW requests
- [ ] No `any` in public signatures; invalid tokens… sorry, wrong topic — no throw-paths in the client for provider failures

## Hints (open only when stuck)

<details><summary>Timeout normalization</summary>
Catch once at the fetch boundary: DOMException name "TimeoutError"/"AbortError" → ApiError("timeout"); TypeError → ApiError("network"). Everything downstream sees only YOUR codes.</details>

<details><summary>Nested contracts</summary>
A FieldSpec always declares <code>type</code>; anything without it is a nested body-map. Recurse with dotted paths.</details>

## Going further (optional)
Add retry-once-on-5xx INSIDE the client (not the handlers!) with a spec proving exactly two requests occurred.
