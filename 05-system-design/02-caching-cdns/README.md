# Topic: Caching & CDNs — the cheapest scale you'll ever buy

> **Goal:** Turn caching from "sprinkle Redis" into deliberate policy: HTTP freshness semantics, TTL jitter against stampedes, and deterministic key design. Three small autograded functions encode the entire discipline.

## Beginner-friendly picks

- 🎥 ByteByteGo / Gaurav Sen caching videos — cache-aside vs write-through animations
- 📝 [web.dev — HTTP caching codelab](https://web.dev/articles/http-cache) — hands-on browser-cache lab

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Cache patterns | cache-aside vs write-through vs write-back (you implemented aside in phase 03 — revisit WHY it dominates) | [karanpratapsingh — caching](https://github.com/karanpratapsingh/system-design#caching) |
| HTTP freshness | `Cache-Control: max-age`, `no-cache` vs `no-store`, `Expires` fallback, heuristic lifetime (10% × Age-since-Last-Modified) | [MDN — HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) |
| CDN push vs pull | pull = lazy & self-healing; push = predictable & operationally heavier; origin-shield concept | [Primer — CDN](https://github.com/donnemartin/system-design-primer#content-delivery-network-cdn) |
| Invalidation | DEL-after-commit (phase 03), versioned keys, purge-by-prefix realities of CDNs | [MDN — invalidation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching/Invalidation) |
| Stampede defense | jittered TTLs spread expirations; single-flight (phase 01 pool!) collapses concurrent misses | your assignment |
| Key design | namespaces, sorted params for order-insensitivity, shape versions (`v2:`) for migrations | phase 03 redis topic recap |

## Keep in mind

- **`no-cache` ≠ don't cache.** It means *revalidate before reuse* — still saves full transfers on 304s.
- **Heuristic freshness is real**: no headers at all + `Last-Modified` → caches assume 10% delta. Your API may be cached when you think it isn't.
- **TTL without jitter synchronizes expiry** across a fleet that warmed together → synchronized miss wall. Spread lifetimes deliberately.
- **Cache keys are APIs**: changing param serialization invalidates nothing and forks traffic between key shapes. Version them.
- **CDNs cache what you didn't tell them to** (heuristics) — explicit `Cache-Control` on EVERY response, including errors, is production hygiene.

## Self-check quiz

<details><summary>1. Response has <code>Cache-Control: max-age=3600</code> but NO Date header. When is it stale?</summary>
Caches fall back to their own request-received time as age zero — stale after ~1h from fetch. Ambiguity is why sending Date matters.</details>

<details><summary>2. Why does full-jitter backoff work for retries but downward-only jitter suits TTLs?</summary>
Retry wants de-synchronization AND delay; TTL must keep entries USEFUL — shrinking lifetime below base×(1−j) trades hit-rate for spread. Direction follows the invariant you protect.</details>

<details><summary>3. Origin shield in one sentence.</summary>
An extra CDN tier that coalesces misses so only ONE request per object hits origin per region instead of one per edge node.</details>

<details><summary>4. You bumped an API's response shape and old clients now crash. Which caching mistake made it worse?</summary>
Unversioned cache keys: stale v1 payloads kept serving post-deploy from every layer (browser→CDN→Redis). Version keys AND set explicit max-age on versioned responses.</details>

## Assignment

[assignment.md](assignment.md) — implement `evaluateFreshness` (HTTP freshness with RFC heuristics), `jitteredTtl`, and `buildCacheKey`. Pure functions; injected clock/rng make every case deterministic.
