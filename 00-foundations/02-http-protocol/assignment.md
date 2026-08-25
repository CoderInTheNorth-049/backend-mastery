# Assignment — Speak HTTP like a protocol, not a library

## The problem you're solving
You call `fetch()` daily, but production outages live inside the details: what exactly is a “malformed” request? When should a client retry, wait, or give up? Today you build both sides: a raw HTTP message parser/serializer, and a retrying fetch wrapper with exponential backoff, timeouts, and polite 429 handling — the same machinery libraries hide from you.

## Your tasks
1. **Part 1 — raw messages** ([src/http-message.ts](src/http-message.ts)):
   - implement `parseRequest`: split headers/body at the blank line, lowercase header names, parse the query string (URL-decoded, duplicates → last wins), slice body to `Content-Length`, throw on garbage start lines. Tolerate both `\r\n` and `\n`.
   - implement `serializeResponse`: status line with proper reason phrases, caller headers verbatim, auto `Content-Length` (byte length! é counts as 2) except on 204.
2. **Part 2 — resilient fetching** ([src/retry.ts](src/retry.ts)):
   - implement `fetchWithRetry`: up to `retries + 1` attempts; retry only 429/5xx (or custom policy); exponential backoff `base * 2^(attempt-1)`; honor numeric `Retry-After` on 429s; per-attempt timeout via AbortSignal; report every retry through `onRetry`; return the last response / rethrow the last error when exhausted.
3. Tests use MSW-simulated flaky servers — run `pnpm test:topic 00-foundations/02-http-protocol` until both spec files pass.

## Definition of done
- [ ] Both specs green, zero unhandled network requests
- [ ] Backoff delays observed are base, base×2, base×4…
- [ ] Malformed JSON bodies become friendly `BAD_JSON`-style errors, never crashes

## Hints

<details><summary>Part 1 hint</summary>
Find `\r\n\r\n` OR `\n\n` for the header/body split. Header lines: split on FIRST `:`. Start line regex suggestion: `/^(\w+)\s+(\S+)\s+HTTP\/(\d\.\d)$/`.
</details>

<details><summary>Part 2 hint</summary>
Structure it as a single loop `for (let attempt = 0; ; attempt++)`. Compute "should I give up?" in one place so responses and errors share logic. Build per-attempt signal inside the loop: `AbortSignal.timeout(ms)` or manual controller + setTimeout (remember to clear it!).
</details>

<details><summary>Part 2 hint 2</summary>
The tests inject `delayFn: async () => {}` — your code must actually call it with computed values even when it resolves instantly, because `onRetry.delayMs` assertions check your backoff math.
</details>

## Acceptance criteria

- [ ] Both spec files green via `pnpm test:topic 00-foundations/02-http-protocol`
- [ ] Zero unhandled MSW requests in test output
- [ ] Backoff math correct: delays observed are base, base*2, base*4…

## Stretch goals

- Add jitter to backoff (`jitter: "full" | "none"` option) — read AWS Architecture Blog's exponential-backoff-and-jitter article (linked in topic README resources)
- Honor HTTP-date form of `Retry-After` (currently only seconds are supported)
