# Assignment — DatabaseHarness: idempotent lifecycle over any provider

## The problem you're solving
Every integration suite secretly needs the same machinery: provision a throwaway database, apply schema once, reset data between tests, tear down cleanly — even when tests fail mid-flight. You built those pieces in phase 03; now you package them into ONE reusable `DatabaseHarness` that works over any provider (Docker, embedded, your own server).

## Your tasks
Implement in [src/harness.ts](src/harness.ts) (`src/providers.ts` is PROVIDED — read it):

1. **`start()`** — idempotent: provider starts once, schema applies once. Concurrent first-calls coalesce onto ONE startup promise. A failed start clears itself so a retry can run.
2. **`reset()`** — one statement: `TRUNCATE "t1", "t2" RESTART IDENTITY CASCADE` over `options.tables`. Before start → `/not started/i` error.
3. **`query(text, params?)`** — delegates to the pool executor; before start → not-started error; after stop → `/stopped/i` error.
4. **`stop()`** — idempotent: closes pool then provider exactly once. A stopped harness can be STARTED AGAIN (fresh runtime — old data must be gone).

## Definition of done
- [ ] Unit spec green against a FAKE provider + recording executor (no servers needed): coalesced starts, single schema apply, counted truncates, exact error messages
- [ ] Integration spec green against a REAL selected provider: full lifecycle + restart cycle

## Hints (open only when stuck)

<details><summary>Coalescing</summary>
<code>this.startPromise ??= (async () => {…})()</code> then await it; on failure clear the field so retry re-runs. On success set started=true.</details>

<details><summary>Pool injection</summary>
Default path imports pg and constructs a Pool from the connection string. The <code>poolFactory</code> option exists so unit tests can record SQL without any database.
</details>

## Going further (optional)
`withTransaction(fn)` helper wrapping BEGIN/COMMIT/ROLLBACK around fn's client.
