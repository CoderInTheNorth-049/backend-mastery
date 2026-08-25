# Assignment — Seven graded SQL queries

## The problem you're solving
A library app stores authors, books, borrowers and loans in Postgres. The product team keeps asking questions the API can't answer yet: “which books have never been borrowed?”, “who are our top readers?”, “how do loans trend month over month?” You'll answer all of them in SQL — because pushing loops into JavaScript when the database can compute the answer is the habit this topic exists to break.

## Your tasks
Open [src/queries.ts](src/queries.ts) — it exports seven string constants, one SELECT each. The seed data (`test-support/seed.sql`) is small enough to verify BY HAND; do that for at least two queries before trusting your SQL.

1. **Q1 `q1_booksWithAuthors`** — book title + author name for every book. Columns: `title`, `author`. Order by book id. *(11 rows)*
2. **Q2 `q2_neverLoanedTitles`** — titles of books with zero loans ever. Column: `title`. Order alphabetically. *(4 rows)*
3. **Q3 `q3_activeLoans`** — borrower email + book title for un-returned loans. Columns: `borrower_email`, `book_title`. Order by loan id. *(4 rows)*
4. **Q4 `q4_loanCountsPerBook`** — loan count PER BOOK including never-borrowed books as 0. Columns: `book_title`, `loan_count`. Order count DESC then title ASC. *(11 rows)*
5. **Q5 `q5_borrowerRanks`** — total loans per borrower plus competition RANK (ties share rank, gaps follow). Columns: `borrower_name`, `total_loans`, `rank`. Order rank ASC then name.
6. **Q6 `q6_monthlyLoans2024`** — loans grouped by calendar month as `'YYYY-MM'`. Columns: `month`, `loan_count`. Ordered by month.
7. **Q7 `q7_latestLoanDayPerBookWindow`** — latest borrowing day per book using a WINDOW function (not GROUP BY). Columns: `book_title`, `latest_day` (UTC date string).

## Definition of done
- [ ] `pnpm test:topic 03-databases/01-sql-fundamentals` green — results compared literally, so column ALIASES and ORDER BY matter
- [ ] Counts arrive as strings (`COUNT()` is bigint over the wire) — your expectations handle that
- [ ] Written exercise `normalization.md` committed (the orders/items table critique from the rubric section below)

## Hints (open only when stuck)

<details><summary>Q2 without LEFT JOIN</summary>
<code>WHERE NOT EXISTS (SELECT 1 FROM "Loan" l WHERE l."bookId" = b.id)</code> — know both idioms.
</details>

<details><summary>Q5 window placement</summary>
Aggregate first (GROUP BY borrower), THEN wrap in a subquery to apply RANK() OVER (ORDER BY total_loans DESC). Windows run after aggregation — one level can't do both.</details>

<details><summary>Q7 window shape</summary>
MAX("borrowedAt") OVER (PARTITION BY bookId), formatted via to_char(... AT TIME ZONE 'UTC', 'YYYY-MM-DD'), de-duplicated with DISTINCT.</details>

## Going further (optional)
Add a query listing borrowers whose loans are ALL overdue relative to a passed-in date — as a prepared statement parameter.
