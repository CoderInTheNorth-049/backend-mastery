export const q1_booksWithAuthors = `
  SELECT b.title, a.name AS author
  FROM "Book" b
  JOIN "Author" a ON a.id = b."authorId"
  ORDER BY b.id;
`;

export const q2_neverLoanedTitles = `
  SELECT b.title
  FROM "Book" b
  WHERE NOT EXISTS (
    SELECT 1 FROM "Loan" l WHERE l."bookId" = b.id
  )
  ORDER BY b.title;
`;

export const q3_activeLoans = `
  SELECT br.email AS borrower_email, bk.title AS book_title
  FROM "Loan" l
  JOIN "Borrower" br ON br.id = l."borrowerId"
  JOIN "Book" bk ON bk.id = l."bookId"
  WHERE l."returnedAt" IS NULL
  ORDER BY l.id;
`;

export const q4_loanCountsPerBook = `
  SELECT bk.title AS book_title, COUNT(l.id) AS loan_count
  FROM "Book" bk
  LEFT JOIN "Loan" l ON l."bookId" = bk.id
  GROUP BY bk.id, bk.title
  ORDER BY loan_count DESC, book_title ASC;
`;

export const q5_borrowerRanks = `
  SELECT
    borrower_name,
    total_loans,
    RANK() OVER (ORDER BY total_loans DESC) AS rank
  FROM (
    SELECT br.name AS borrower_name, COUNT(*) AS total_loans
    FROM "Borrower" br
    JOIN "Loan" l ON l."borrowerId" = br.id
    GROUP BY br.id, br.name
  ) totals
  ORDER BY rank ASC, borrower_name ASC;
`;

export const q6_monthlyLoans2024 = `
  SELECT
    to_char(date_trunc('month', l."borrowedAt"), 'YYYY-MM') AS month,
    COUNT(*) AS loan_count
  FROM "Loan" l
  GROUP BY date_trunc('month', l."borrowedAt")
  ORDER BY month ASC;
`;

export const q7_latestLoanDayPerBookWindow = `
  SELECT DISTINCT
    bk.title AS book_title,
    to_char(MAX(l."borrowedAt") OVER (PARTITION BY l."bookId") AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS latest_day
  FROM "Loan" l
  JOIN "Book" bk ON bk.id = l."bookId"
  ORDER BY book_title ASC;
`;
