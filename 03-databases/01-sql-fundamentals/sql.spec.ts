import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DATABASE_URL, HAS_DB } from "../test-support/env";
import {
  q1_booksWithAuthors,
  q2_neverLoanedTitles,
  q3_activeLoans,
  q4_loanCountsPerBook,
  q5_borrowerRanks,
  q6_monthlyLoans2024,
  q7_latestLoanDayPerBookWindow,
} from "./src/queries";

describe.skipIf(!HAS_DB)("SQL fundamentals — graded queries", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool?.end();
  });

  async function rowsOf(sql: string): Promise<Record<string, unknown>[]> {
    expect(sql.trim().length, "query is still empty — implement it in src/queries.ts").toBeGreaterThan(0);
    const result = await pool.query(sql);
    return result.rows;
  }

  it("Q1 pairs every book with its author name", async () => {
    expect(await rowsOf(q1_booksWithAuthors)).toEqual([
      { title: "Analytical Engine Notes", author: "Ada Lovelace" },
      { title: "The Art of Computing", author: "Ada Lovelace" },
      { title: "Compilers Explained", author: "Grace Hopper" },
      { title: "Flow Mazes", author: "Grace Hopper" },
      { title: "On Computable Numbers", author: "Alan Turing" },
      { title: "Enigma Papers", author: "Alan Turing" },
      { title: "A Discipline of Programming", author: "Edsger Dijkstra" },
      { title: "Go To Statement Considered Harmful", author: "Edsger Dijkstra" },
      { title: "Notes on Structured Concurrency", author: "Edsger Dijkstra" },
      { title: "Unloved Volume I", author: "Ada Lovelace" },
      { title: "Unloved Volume II", author: "Alan Turing" },
    ]);
  });

  it("Q2 lists never-loaned book titles alphabetically", async () => {
    expect(await rowsOf(q2_neverLoanedTitles)).toEqual([
      { title: "Flow Mazes" },
      { title: "Notes on Structured Concurrency" },
      { title: "Unloved Volume I" },
      { title: "Unloved Volume II" },
    ]);
  });

  it("Q3 lists active loans with borrower email and book title", async () => {
    expect(await rowsOf(q3_activeLoans)).toEqual([
      { borrower_email: "ravi@mail.test", book_title: "Compilers Explained" },
      { borrower_email: "mei@mail.test", book_title: "Analytical Engine Notes" },
      { borrower_email: "ravi@mail.test", book_title: "A Discipline of Programming" },
      { borrower_email: "ravi@mail.test", book_title: "Analytical Engine Notes" },
    ]);
  });

  it("Q4 counts loans per book including zeros, ranked then alphabetical", async () => {
    // Counts arrive as strings — COUNT() is bigint over the wire.
    expect(await rowsOf(q4_loanCountsPerBook)).toEqual([
      { book_title: "Analytical Engine Notes", loan_count: "3" },
      { book_title: "A Discipline of Programming", loan_count: "2" },
      { book_title: "Compilers Explained", loan_count: "2" },
      { book_title: "On Computable Numbers", loan_count: "2" },
      { book_title: "Enigma Papers", loan_count: "1" },
      { book_title: "Go To Statement Considered Harmful", loan_count: "1" },
      { book_title: "The Art of Computing", loan_count: "1" },
      { book_title: "Flow Mazes", loan_count: "0" },
      { book_title: "Notes on Structured Concurrency", loan_count: "0" },
      { book_title: "Unloved Volume I", loan_count: "0" },
      { book_title: "Unloved Volume II", loan_count: "0" },
    ]);
  });

  it("Q5 ranks borrowers by lifetime loans with competition ranking", async () => {
    expect(await rowsOf(q5_borrowerRanks)).toEqual([
      { borrower_name: "Ravi", total_loans: "4", rank: "1" },
      { borrower_name: "Mei", total_loans: "3", rank: "2" },
      { borrower_name: "Zoe", total_loans: "3", rank: "2" },
      { borrower_name: "Omar", total_loans: "2", rank: "4" },
    ]);
  });

  it("Q6 aggregates loans per calendar month", async () => {
    expect(await rowsOf(q6_monthlyLoans2024)).toEqual([
      { month: "2024-01", loan_count: "2" },
      { month: "2024-02", loan_count: "1" },
      { month: "2024-03", loan_count: "3" },
      { month: "2024-04", loan_count: "2" },
      { month: "2024-05", loan_count: "3" },
      { month: "2024-06", loan_count: "1" },
    ]);
  });

  it("Q7 finds the latest borrowing day per book via a window function", async () => {
    expect(await rowsOf(q7_latestLoanDayPerBookWindow)).toEqual([
      { book_title: "A Discipline of Programming", latest_day: "2024-05-06" },
      { book_title: "Analytical Engine Notes", latest_day: "2024-06-09" },
      { book_title: "Compilers Explained", latest_day: "2024-04-05" },
      { book_title: "Enigma Papers", latest_day: "2024-04-18" },
      { book_title: "Go To Statement Considered Harmful", latest_day: "2024-03-20" },
      { book_title: "On Computable Numbers", latest_day: "2024-05-28" },
      { book_title: "The Art of Computing", latest_day: "2024-05-15" },
    ]);
  });
});
