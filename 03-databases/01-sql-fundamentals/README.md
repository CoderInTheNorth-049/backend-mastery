# Topic: SQL fundamentals — think in sets

> **Goal:** Stop writing loops that filter rows and start asking the database for exactly the answer. Seven graded queries, each unlocking a concept you'll use weekly as a backend engineer.

## Beginner-friendly picks

- 🧪 [SQLBolt](https://sqlbolt.com/) + [Mode SQL Tutorial](https://mode.com/sql-tutorial/) — gentle → deeper, both free
- 🎥 YouTube search: **“SQL joins explained”** — visual Venn-style explainers help JOINs click

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| SELECT discipline | projection ≠ table dump; WHERE vs HAVING; NULL three-valued logic traps | [PostgreSQL Tutorial — basics](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-select/) |
| JOINs | inner vs LEFT semantics; when `NOT EXISTS` beats `LEFT JOIN … IS NULL`; join order doesn't set execution (planner does) | [PG Tutorial — joins](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-joins/) |
| GROUP BY & aggregates | grouping sets intuition; COUNT(*) vs COUNT(col); filtering groups with HAVING | same series |
| Subqueries & CTEs | readability vs performance history of CTEs (pre-v12 fence → v12+ inlined); derived tables | [PG docs — WITH queries](https://www.postgresql.org/docs/current/tutorial-window.html) |
| Window functions | aggregate WITHOUT collapsing rows; RANK vs ROW_NUMBER vs DENSE_RANK; PARTITION BY mental model | [Postgres official window tutorial](https://www.postgresql.org/docs/current/tutorial-window.html) · [window functions how-to](https://mode.com/sql-tutorial/sql-window-functions/) |
| Modeling & normalization | 1NF/2NF/3NF in plain words; constraints (PK/FK/UNIQUE/CHECK) as *executable documentation*; when denormalization is honest | [Use The Index, Luke ch. modeling intro](https://use-the-index-luke.com/sql/preface) · [3NF explained](https://www.essentialsql.com/normalize-your-database-tables/) |

## Keep in mind

- **NULL never equals anything** including itself — `WHERE x != 'a'` silently drops NULL rows. Use `IS DISTINCT FROM` when you mean it.
- **LEFT JOIN + WHERE on right table = accidental INNER JOIN** unless the predicate lives in the ON clause. The classic silent-data-loss bug.
- **COUNT(col) ignores NULLs**; COUNT(*) counts rows. Dashboards have lied for less.
- **RANK leaves gaps after ties** (1,2,2,4); DENSE_RANK doesn't (1,2,2,3). Interviews love this distinction.
- **Constraints beat application checks**: they hold under every future client, batch script, and tired 2 AM migration.
- Every query in this topic is graded by RESULT SET equality — column names matter (aliases specified), row ORDER matters only where the task says so.

## Self-check quiz

<details><summary>1. Why can <code>LEFT JOIN</code> quietly degrade to <code>INNER JOIN</code>?</summary>
A WHERE-clause predicate referencing the right table (e.g. WHERE r.x = 5) filters out NULL-extended rows post-join. Move the condition into the ON clause to keep unmatched left rows.</details>

<details><summary>2. Your per-user totals query returns 10k rows and you sum them in JS. Better?</summary>
Aggregate in SQL (GROUP BY user): ship one number per group over the wire, let the DB's optimized aggregation do the work. Application-side aggregation is a code smell here.</details>

<details><summary>3. When does ROW_NUMBER differ from RANK for "top 3 customers"?</summary>
With ties: RANK gives both tied customers rank 2 then jumps to 4 — LIMIT 3 may drop a deserving tie or include 4 people with DENSE_RANK semantics. Decide business intent explicitly.</details>

<details><summary>4. A colleague stores comma-separated tags in one column. Which normal form broke, and what breaks at runtime?</summary>
1NF (non-atomic values). Runtime: no referential integrity, tag renames need string surgery, indexing a specific tag requires LIKE scans or full scans.</details>

## Assignment

[assignment.md](assignment.md) — seven queries against the seeded library database (authors, books, borrowers, loans). Results are checked literally: exact columns, exact rows, deterministic ordering.
