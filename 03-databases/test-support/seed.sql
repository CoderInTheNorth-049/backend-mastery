-- Phase 03 deterministic seed. Executed once by vitest.global-setup.ts
-- AFTER `prisma db push`. All ids are explicit; sequences are reset so
-- specs can rely on stable identity across reruns.
--
-- Topics that mutate data TRUNCATE their own tables in beforeEach and
-- re-seed inline — this file is the read-only baseline (topic 01).

TRUNCATE "Loan", "Book", "Borrower", "Author",
         "Comment", "PostTag", "Tag", "Post",
         "Seat", "PageEvent", "Account"
RESTART IDENTITY CASCADE;

INSERT INTO "Author" (id, name) VALUES
  (1, 'Ada Lovelace'),
  (2, 'Grace Hopper'),
  (3, 'Alan Turing'),
  (4, 'Edsger Dijkstra');

INSERT INTO "Book" (id, title, "authorId") VALUES
  (1,  'Analytical Engine Notes',          1),
  (2,  'The Art of Computing',             1),
  (3,  'Compilers Explained',              2),
  (4,  'Flow Mazes',                       2),
  (5,  'On Computable Numbers',            3),
  (6,  'Enigma Papers',                    3),
  (7,  'A Discipline of Programming',      4),
  (8,  'Go To Statement Considered Harmful', 4),
  (9,  'Notes on Structured Concurrency',  4),
  (10, 'Unloved Volume I',                 1),
  (11, 'Unloved Volume II',                3);

INSERT INTO "Borrower" (id, name, email) VALUES
  (1, 'Ravi', 'ravi@mail.test'),
  (2, 'Mei',  'mei@mail.test'),
  (3, 'Zoe',  'zoe@mail.test'),
  (4, 'Omar', 'omar@mail.test');

INSERT INTO "Loan" (id, "bookId", "borrowerId", "borrowedAt", "returnedAt") VALUES
  (1,  1, 1, '2024-01-05T10:00:00Z', '2024-01-19T10:00:00Z'),
  (2,  3, 1, '2024-01-22T10:00:00Z', NULL),
  (3,  5, 2, '2024-02-08T10:00:00Z', '2024-02-25T10:00:00Z'),
  (4,  7, 4, '2024-03-02T10:00:00Z', '2024-03-15T10:00:00Z'),
  (5,  1, 2, '2024-03-10T10:00:00Z', NULL),
  (6,  8, 3, '2024-03-20T10:00:00Z', '2024-04-01T10:00:00Z'),
  (7,  3, 3, '2024-04-05T10:00:00Z', '2024-04-28T10:00:00Z'),
  (8,  6, 4, '2024-04-18T10:00:00Z', '2024-05-02T10:00:00Z'),
  (9,  7, 1, '2024-05-06T10:00:00Z', NULL),
  (10, 2, 3, '2024-05-15T10:00:00Z', '2024-06-01T10:00:00Z'),
  (11, 5, 2, '2024-05-28T10:00:00Z', '2024-06-10T10:00:00Z'),
  (12, 1, 1, '2024-06-09T10:00:00Z', NULL);

SELECT setval('"Loan_id_seq"', 12);

INSERT INTO "Post" (id, title, published, "authorId", "createdAt") VALUES
  (1, 'Drafting Kafka',        false, 1, '2024-03-01T09:00:00Z'),
  (2, 'Cache Patterns',        true,  2, '2024-03-02T09:00:00Z'),
  (3, 'JWT Deep Dive',         true,  2, '2024-03-03T09:00:00Z'),
  (4, 'Streams 101',           true,  3, '2024-03-04T09:00:00Z'),
  (5, 'Indexes Demystified',   true,  3, '2024-03-05T09:00:00Z'),
  (6, 'Saga Basics',           false, 4, '2024-03-06T09:00:00Z');

SELECT setval('"Post_id_seq"', 6);

INSERT INTO "Tag" (id, name) VALUES
  (1, 'postgres'), (2, 'nodejs'), (3, 'kafka'), (4, 'security');

SELECT setval('"Tag_id_seq"', 4);

INSERT INTO "PostTag" ("postId", "tagId") VALUES
  (2, 1), (2, 2),
  (3, 4), (3, 2),
  (4, 2),
  (5, 1);

INSERT INTO "Comment" (id, "postId", body, "createdAt") VALUES
  (1, 2, 'write-through next?', '2024-03-07T10:00:00Z'),
  (2, 2, 'what about stampedes', '2024-03-07T11:00:00Z'),
  (3, 2, 'TTL math please',      '2024-03-08T09:30:00Z'),
  (4, 3, 'alg none saved my weekend', '2024-03-09T08:00:00Z'),
  (5, 3, 'timingSafeEqual ftw',       '2024-03-09T09:00:00Z'),
  (6, 3, 'refresh tokens when',       '2024-03-10T10:00:00Z'),
  (7, 3, 'jwks caching?',             '2024-03-11T11:00:00Z'),
  (8, 3, 'revocation list sizes',     '2024-03-12T12:00:00Z'),
  (9, 4, 'backpressure finally clear','2024-03-13T13:00:00Z'),
  (10, 5, 'bitmap vs index scan',     '2024-03-14T14:00:00Z'),
  (11, 5, 'covering index win',       '2024-03-15T15:00:00Z');

SELECT setval('"Comment_id_seq"', 11);

INSERT INTO "Seat" ("showtimeId", label, status, version) VALUES
  (1, 'A1', 'free', 0), (1, 'A2', 'free', 0), (1, 'A3', 'free', 0),
  (1, 'A4', 'free', 0), (1, 'A5', 'free', 0), (1, 'A6', 'free', 0),
  (1, 'A7', 'free', 0), (1, 'A8', 'free', 0), (1, 'A9', 'free', 0),
  (1, 'A10', 'free', 0),
  (2, 'B1', 'free', 0), (2, 'B2', 'free', 0);

INSERT INTO "Account" (id, owner, balance) VALUES
  (1, 'alice', 100000),
  (2, 'bob',   100000),
  (3, 'carol', 100000);

INSERT INTO "PageEvent" (path, status, ms, "createdAt")
SELECT
  '/api/' || (ARRAY['users','orders','search','feed'])[1 + g % 4],
  CASE WHEN g % 20 < 17 THEN 'success' WHEN g % 20 < 19 THEN 'error' ELSE 'bot' END,
  50 + (g * 37) % 1500,
  now() - (g || ' minutes')::interval
FROM generate_series(1, 40000) AS g;
