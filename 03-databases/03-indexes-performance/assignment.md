# Assignment — Make the planner ditch its full scans

## The problem you're solving
Two dashboard queries against a 40k-row `PageEvent` table are slow, and the on-call's first instinct is always “add an index”. But indexes have write-costs, and a WRONG index gets ignored by the query planner entirely. You'll design two indexes for two fixed queries — and the spec proves whether the planner ACTUALLY uses yours by reading EXPLAIN output programmatically.

## Your tasks
Implement in [src/indexes.ts](src/indexes.ts) — exact index NAMES are contractual:

1. **`idxEventsQuery`** → `CREATE INDEX IF NOT EXISTS idx_events_status_path_time ON "PageEvent" (…)`
   Target query: filters `status = 'error' AND path = '/api/orders'`, sorts by `"createdAt" DESC`, takes 20.
   Your composite must serve the equalities AND the ordering (no Sort node afterward).
2. **`idxSlowSuccesses`** → partial index named `idx_events_slow_success`
   Target query: `WHERE status = 'success' AND ms >= 1500 ORDER BY ms DESC LIMIT 10`.
   Partial predicate must use the fixed bound `ms >= 1500` (immutable!) so the planner can trust it.

## Definition of done
- [ ] Spec green: after applying YOUR DDL, EXPLAIN shows a node with your index name and NO Seq Scan anywhere in the tree
- [ ] Both statements are idempotent (`IF NOT EXISTS`) — specs re-run them every pass
- [ ] Written deliverable `analysis.md` committed: read the provided pre-index EXPLAIN snippet and answer its four questions with numbers from the plan (self-score /16, commit at ≥13)

## Hints (open only when stuck)

<details><summary>Composite column order</summary>
Equality columns first (<code>status</code>, <code>path</code>), then the sort column with matching direction (<code>"createdAt" DESC</code>). The planner walks the index tail-first and stops at LIMIT.
</details>

<details><summary>Partial predicates</summary>
Must be immutable expressions over this table only — that's why "ms &gt;= 1500" works but "created_at &gt; now()" doesn't.
</details>

## Going further (optional)
Add `INCLUDE (id, path)` to make Q1 index-only; measure whether it helps and note the trade-off in analysis.md.
