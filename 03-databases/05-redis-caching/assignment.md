# Assignment — Cache-aside, done properly

## The problem you're solving
Your user API melts every time a marketing campaign lands, because every request hits Postgres. Caching fixes it — until the cache lies: stale emails after updates, missing users hammered forever, and a thundering herd when a hot key expires. You'll build the wrapper that handles ALL of it: cache-aside reads with hit/miss stats, negative caching, invalidation after writes, and single-flight deduplication.

## Your tasks
Implement in [src/cache.ts](src/cache.ts) (`src/redis-cache-client.ts` is PROVIDED glue):

1. **`CachedUserRepo`** wrapping any `UserSource` (`fetch`/`save`) through any `CacheClient` (`get`/`set`/`del`):
   - `get(id)` → check key `user:${id}`; HIT = parse JSON + count a hit; MISS = count it, `source.fetch`, then ALWAYS populate the cache (even for null! — negative caching stops repeated misses from reaching the DB), using `ttlSeconds`
   - `update(user)` → `source.save` FIRST, then delete the key (order matters: invalidate after commit)
   - `invalidate(id)` / `stats()` → `{ hits, misses }` cumulative
2. **`createSingleFlight()`** → object with `run(key, loader)` and `size()`:
   - concurrent same-key calls share ONE loader invocation (all receive its value or its rejection)
   - different keys never block each other
   - the in-flight entry clears on BOTH resolve and reject (a failed load must be retryable)

## Definition of done
- [ ] Unit spec green WITHOUT any server running (fake cache client)
- [ ] Integration spec green against real Redis when available (skips otherwise)
- [ ] Stats survive interleaved hits/misses; stampede test shows exactly ONE source call for 10 racing readers

## Hints (open only when stuck)

<details><summary>Negative entries</summary>
<code>JSON.stringify(null)</code> is the string <code>"null"</code> and parses back to null. No sentinel magic needed — just never special-case empty results on read.</details>

<details><summary>Single-flight core</summary>
Map&lt;key, Promise&gt;. If absent: create from loader, attach <code>.finally(() =&gt; map.delete(key))</code>, store, return. If present: return as-is. The delete must run on rejection too.
</details>

## Going further (optional)
Probabilistic early refresh: when remaining TTL < 10%, refresh in the background on read (extend CacheClient with an optional `ttl(key)`).
