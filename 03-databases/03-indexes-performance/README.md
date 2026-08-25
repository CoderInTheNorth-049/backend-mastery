# Topic: Indexes & performance — evidence over vibes

> **Goal:** Turn "it feels slow" into a plan you can read, an index you can defend, and a measurable before/after. You'll create real indexes and prove the planner uses them by parsing EXPLAIN output programmatically.

## Beginner-friendly picks

- 🧪 [explain.dalibo.com](https://explain.dalibo.com/) — PASTE your EXPLAIN output and get a visual plan tree
- 🧪 [explain.depesz.com](https://explain.depesz.com/) — alternative analyzer; highlights slow nodes

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| B-trees without math | sorted structure → O(log n) lookups + ordered scans; why LIKE '%x' can't use one | [Use The Index, Luke — B-tree](https://use-the-index-luke.com/anatomy/introduction) |
| Reading EXPLAIN | Seq Scan vs Index Scan vs Bitmap Heap; cost vs actual rows;Buffers | [PG docs — EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html) · [explain.dalibo.com](https://explain.dalibo.com/) (paste plans!) |
| Composite column order | equality columns first, then sort/range; skipping the leading column kills the index | [Use The Index — composite](https://use-the-index-luke.com/sql/indexes/composite) |
| Partial indexes | indexes over a WHERE slice — tiny, blazing, and honest about workload | [PG docs — partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html) |
| Covering / INCLUDE | index-only scans when the query's columns ride along | [PG docs — index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html) |
| Write-cost trade-off | every index taxes every INSERT/UPDATE; indexing ≠ free speed | [Use The Index — DML](https://use-the-index-luke.com/sql/dml) |

## Keep in mind

- **The planner doesn't obey you, it costs you.** A "perfect" index gets ignored when stats say sequential is cheaper. Read the plan, don't argue.
- **Column order is semantics**: `(a, b)` serves `WHERE a=?`, `(a=? AND b=?)`, and `ORDER BY a,b`-style patterns — but NOT bare `WHERE b=?`.
- **Partial predicates must be immutable** — `WHERE created_at > now()` in an index is invalid; fixed bounds are fine.
- **N+1 lives above the DB** (phase 02) but shows up here as 500 identical fast queries — fast ≠ free; count round trips.
- **VACUUM/statistics reality:** plans come from sampled stats; fresh tables can mislead until ANALYZE runs (the harness handles this; prod you won't be spared).

## Self-check quiz

<details><summary>1. Why was your index on <code>(path)</code> ignored by <code>WHERE path='/api/users'</code>?</summary>
Selectivity: if most rows share few distinct paths, seq scan wins on cost. Check pg_stats correlation/n_distinct, or the index simply wasn't valid/analyzed. Plans are economics, not promises.</details>

<details><summary>2. Query filters status AND sorts created_at DESC. Two candidate indexes — which and why?</summary>
(status, created_at DESC): equality prefix + order satisfied → no sort step, LIMIT stops early. A bare created_at index must scan-and-filter across statuses.</details>

<details><summary>3. What breaks if an index's partial WHERE uses NOW()?</summary>
Invalid at DDL time — predicates must be immutable so the index content is stable. Use fixed cutoffs or expression indexes on computed columns.</details>

<details><summary>4. Your fix made p95 great and p99 worse at write time. Explain.</summary>
More indexes = more maintenance per INSERT/UPDATE (+possible HOT-update disqualification). You traded write latency/amplification for reads — decide with numbers from both sides.</details>

## Assignment

[assignment.md](assignment.md) — two real queries against a 40k-row table: design the composite and the partial index that make the planner ditch its full scans, verified by machine-read EXPLAIN output.
