# Assignment — Build a tiny recursive DNS resolver (in-process)

## The problem you're solving
Every request your API serves starts with someone translating a name like `api.yoursite.com` into an IP address. Real resolvers follow chains of aliases, remember answers for a while (caching), and protect themselves from loops in bad data. You'll build that logic — no network needed, pure functions — because interviewers *love* asking “what happens when DNS breaks?” and you'll actually know.

## Your tasks
1. Open [src/dns.ts](src/dns.ts) and read the type definitions — they're the contract.
2. Implement `resolveDns` so it:
   - returns the IP immediately when the queried name has a direct `A` record, caching it with `expiresAt = now + ttl`
   - follows `CNAME` chains (a → b → … → A), reporting every name it visited in order
   - caches under the ORIGINAL query using the **smallest TTL seen along the chain**
   - serves repeat queries from cache until they expire (`cached: true`)
   - throws helpful errors for unknown names, broken chains, and cycles (yes, someone will ship `a→b→a` someday)
3. Run `pnpm test:topic 00-foundations/01-internet-protocols` until green.

## Definition of done
- [ ] All spec cases pass
- [ ] No `Date.now()` inside your function (time is injected — that's how real systems stay testable)
- [ ] Loops are detected wherever they start

## Hints (peek progressively)

<details><summary>Hint 1</summary>
Start with a plain `while` loop: look up current name, if missing → throw; if A → done; if CNAME → move pointer. Add the visited-`Set` once basic chains work.
</details>

<details><summary>Hint 2</summary>
Track `minTtl` while walking. Write the cache entry only on success, keyed by the ORIGINAL query, value = final ip, expiresAt = now + minTtl.
</details>

<details><summary>Hint 3</summary>
Cache read must happen before any record lookup, and its `cached:true` result must short-circuit even if the records map changed underneath.
</details>

## Acceptance criteria

- [ ] `pnpm test:topic 00-foundations/01-internet-protocols` all green
- [ ] No `Date.now()` / `Math.random()` in your implementation
- [ ] Loop detection works regardless of where the cycle starts

## Stretch goals (optional)

- Support multiple A records (round-robin choice via injected `pick?: (ips: string[]) => string`)
- Return negative-caching: cache "NXDOMAIN" results briefly (real resolvers do this)
