# Topic: The HTTP protocol — deep enough to debug it

> **Goal:** Treat HTTP as bytes-on-a-wire, not magic from `fetch()`. You'll parse raw request messages by hand and build production-grade retry logic.

## Beginner-friendly picks

- 🎥 YouTube search: **“HTTP crash course for beginners”** — Traversy Media / freeCodeCamp both have solid one-shots
- 📝 [httpstatuses.com](https://httpstatuses.com/) — click-through status code reference (bookmark it)
- 🧪 [httpbin.org](https://httpbin.org/) — poke real requests/responses in your browser

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Message anatomy | start line, headers, blank line, body; why `\r\n`; Content-Length vs chunked | [MDN — HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages) |
| Methods & safety | idempotent vs safe; why PUT is idempotent but POST isn't; PATCH semantics debates | [MDN — methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) |
| Status codes that matter | 2xx family, 301 vs 302 vs 307/308 (method preservation!), 4xx client-fault taxonomy, 429 + Retry-After, 5xx blame rules | [MDN — status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) |
| Headers you'll live in | Cache-Control (no-store vs no-cache!), ETag/If-None-Match, Vary, CORS quartet, Set-Cookie flags | [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS), [web.dev cookies](https://web.dev/articles/http-cookies-explained) |
| Caching model | freshness vs validation; heuristic caching; why CDNs change everything | [MDN — HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) |
| HTTP versions | 1.1 keep-alive/pipelining problem → 2 multiplexing/stream priority → 3 QUIC; what breaks (proxy middleboxes) | [hpbn.co ch.7-9](https://hpbn.co/http1x/) · [cloudflare http3](https://www.cloudflare.com/learning/performance/what-is-http3/) |

## Keep in mind (production scars)

- **GET is safe, not pure.** It may hit analytics, trigger caches to warm — it just shouldn't have side effects clients depend on.
- **Retries without idempotency = duplicate charges.** Rule of thumb: only auto-retry requests that are idempotent OR carry an idempotency key (you'll build this pattern properly in the flagship project).
- **404 vs 401 vs 403 leaks info deliberately or accidentally.** Decide your policy explicitly.
- **CORS is browser-enforced, not server security.** curl doesn't care about your CORS config; attackers don't use browsers with your rules.
- **Timeouts everywhere:** connect, TLS, headers, body, idle. A fetch without a timeout is a hung worker waiting to happen (your retry assignment enforces this habit).
- **429 means respect Retry-After**, and still back off exponentially — thundering herds of polite-at-first clients DDoS recovering services daily.

## Self-check quiz

<details><summary>1. Client sends POST /orders, times out after 2s, retries. Server processed the first attempt fine. What happens, and which mechanism fixes it?</summary>
Second POST creates a duplicate order (POST isn't idempotent). Fix: idempotency keys — client sends unique key; server stores key→response and replays it for duplicates. (Stripe-style.)
</details>

<details><summary>2. Why does a 301 redirect sometimes break POST APIs while 308 doesn't?</summary>
301/302 historically allow user agents to switch method to GET ("legacy compatibility"); 307/308 forbid method changes. If your POST hits a 301, the retried request may arrive as GET.
</details>

<details><summary>3. Your API returns 200 with {"error": "..."} because "it's easier for the frontend". Defend or attack.</summary>
Attack: breaks caches, monitoring (error rates invisible in status metrics), generic middleware, and HTTP semantics; every client must parse bodies to detect failure. Errors deserve error statuses; machines and humans both lose otherwise.
</details>

<details><summary>4. What's the difference between Cache-Control: no-cache and no-store?</summary>
no-store: don't save anywhere, ever (secrets). no-cache: cache it, but revalidate with the origin (ETag/If-None-Match) before each reuse. Misreading this ships PII into shared caches.
</details>

<details><summary>5. Preflight OPTIONS appears for some cross-site calls but not others. Why?</summary>
Only "non-simple" requests preflight: non-simple methods (PUT/DELETE), non-simple headers (Authorization, custom), or non-simple content types (application/json!). Same-site or simple GET/POST skip it.
</details>

## Assignment

Two parts in [assignment.md](assignment.md):

1. **`parseRequest` / `serializeResponse`** — raw HTTP message handling, the foundation for understanding every framework you'll ever use.
2. **`fetchWithRetry`** — production retry with exponential backoff, timeouts, and status-based policies, tested against MSW-mocked failures.
