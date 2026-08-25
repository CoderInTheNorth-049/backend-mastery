// ── Seven graded queries ─────────────────────────────────────────────────
// Each export is ONE SELECT statement (string). Column aliases and ORDER BY
// are part of the contract — see ../assignment.md.
//
// Schema reminder: identifiers are camelCase → quote them: "Book", "authorId".

export const q1_booksWithAuthors = `
  -- TODO: book title + author name, ordered by book id (9 rows)
`;

export const q2_neverLoanedTitles = `
  -- TODO: titles of books with zero loans ever, ordered by title (4 rows)
`;

export const q3_activeLoans = `
  -- TODO: borrower_email + book_title for un-returned loans, by loan id (4 rows)
`;

export const q4_loanCountsPerBook = `
  -- TODO: book_title + loan_count INCLUDING zero-loan books,
  -- ORDER BY loan_count DESC, book_title ASC (11 rows)
`;

export const q5_borrowerRanks = `
  -- TODO: borrower_name + total_loans + competition RANK over totals,
  -- ORDER BY rank ASC, borrower_name ASC (4 rows)
`;

export const q6_monthlyLoans2024 = `
  -- TODO: month ('YYYY-MM') + loan_count grouped by borrowedAt's month,
  -- ordered by month (6 rows)
`;

export const q7_latestLoanDayPerBookWindow = `
  -- TODO: book_title + latest_day (UTC 'YYYY-MM-DD' of MAX(borrowedAt))
  -- using a WINDOW function (not GROUP BY), books with loans only,
  -- ordered by book_title (7 rows)
`;
