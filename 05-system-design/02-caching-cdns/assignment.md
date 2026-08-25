# Assignment — cache math, deterministic and graded

## The problem you're solving

Your API survives launch day because Redis absorbs the hot paths — until three classic bugs bite: stale payloads after updates, a thundering herd when one hot key expires, and cache keys that fork traffic between shapes. You'll implement the math that prevents all three.


**Estimated:** 4 hours · **File:** [src/cache-math.ts](src/cache-math.ts) · **Graded by:** [cache-math.spec.ts](cache-math.spec.ts)

## 1. `evaluateFreshness(input, nowMs)`

```ts
interface FreshnessInput {
  cacheControl?: string;   // e.g. "public, max-age=3600" | "no-store" | "no-cache, max-age=60"
  date?: string;           // response Date header (RFC 1123 / any Date-parseable)
  expires?: string;
  lastModified?: string;
}
type FreshnessReason = "no-store" | "no-cache" | "max-age" | "expires" | "heuristic" | "stale";

function evaluateFreshness(input, nowMs): {
  fresh: boolean;
  reason: FreshnessReason;
  ageSeconds?: number;      // floor((now - date)/1000), when a lifetime applies
  lifetimeSeconds?: number; // the applicable freshness lifetime
};
```

Precedence & semantics (EXACTLY this order):

1. **`no-store` anywhere in Cache-Control** → `{fresh:false, reason:"no-store", ageSeconds:0, lifetimeSeconds:0}`.
2. **`no-cache` present** → `{fresh:false, reason:"no-cache", ageSeconds:0, lifetimeSeconds:0}` (revalidation always required).
3. **`max-age=N`** (first valid occurrence wins; malformed numbers ignored): `date` missing ⇒ age=0. Fresh iff `age < N`. Report floored `ageSeconds`, `lifetimeSeconds=N`.
4. Else **`expires`** present: if `date` present → `lifetime = (expires - date)/1000`, fresh iff `age < lifetime`; else → fresh iff `now < expiresMs` with `lifetime = max(0,(expires-now))/1000`. Report both fields.
5. Else heuristic: needs BOTH `date` AND `lastModified` → `lifetime = floor(0.1 × (date − lastModified)/1000)`; fresh iff age < lifetime. Otherwise → stale.
6. Nothing applicable → `{fresh:false, reason:"stale"}` (no age/lifetime fields).

Parsing rule: lowercase Cache-Control, split on commas, trim tokens.

## 2. `jitteredTtl(baseSeconds, jitterFactor, rng)`

```ts
function jitteredTtl(base: number, jitterFactor: number, rng: () => number): number
// returns Math.max(1, Math.round(base * (1 - jitterFactor * rng())))
```
Downward-only spread (entries stay useful); never below 1s. `jitterFactor` clamped to `[0,1]`.

## 3. `buildCacheKey(namespace, params, version?)`

```
format: [v<version>|]<namespace>|<k1>=<v1>|<k2>=<v2>…
```
- Params sorted by key ascending; values via `String()` (`true→"true"`).
- Empty/undefined params contribute nothing; empty namespace allowed.
- `version` prefixes as `v3|namespace|…`.

Deterministic keys are the contract — same inputs, byte-identical output.

## Hints

<details><summary>Header parsing</summary>
const tokens = (cacheControl ?? "").toLowerCase().split(",").map(t => t.trim());
flags: Set(tokens); maxAge from first token matching /^max-age=(\d+)$/.
</details>

<details><summary>Date handling</summary>
Wrap Date.parse in a helper returning NaN-safe ms. Invalid dates behave as ABSENT (falls through precedence).
</details>

## Acceptance criteria

- [ ] Spec green — every case uses injected `now`/`rng`; zero `Date.now()` in your implementation
- [ ] Precedence tests pass in one shot (they encode the order table above)

## Stretch

- Support `s-maxage` taking precedence over `max-age` (CDN vs browser split)
- Add `stale-while-revalidate` reporting as its own reason
