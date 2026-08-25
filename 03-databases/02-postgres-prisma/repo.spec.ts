import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DATABASE_URL, HAS_DB } from "../test-support/env";
import {
  createPostWithTags,
  DomainError,
  moveComments,
  publishPost,
  publishedWithCommentCounts,
} from "./src/repo";

describe.skipIf(!HAS_DB)("blog repository (real PostgreSQL)", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    // Fresh blog tables per test; authors persist from the global seed (ids 1-4).
    await prisma.$executeRawUnsafe(
      `TRUNCATE "Comment", "PostTag", "Tag", "Post" RESTART IDENTITY CASCADE`,
    );
    // Fixture mirrors the assignment narrative:
    //   p2 Cache Patterns(3 comments), p3 JWT Deep Dive(5),
    //   p4 Streams 101(1), p5 Indexes Demystified(2); p1/p6 drafts.
    const posts = [
      { id: 1, title: "Drafting Kafka", published: false, authorId: 1 },
      { id: 2, title: "Cache Patterns", published: true, authorId: 2 },
      { id: 3, title: "JWT Deep Dive", published: true, authorId: 2 },
      { id: 4, title: "Streams 101", published: true, authorId: 3 },
      { id: 5, title: "Indexes Demystified", published: true, authorId: 3 },
      { id: 6, title: "Saga Basics", published: false, authorId: 4 },
    ];
    for (const p of posts) await prisma.post.create({ data: p });

    const tagNames = ["postgres", "nodejs", "kafka", "security"];
    for (const name of tagNames) await prisma.tag.create({ data: { name } });

    const links = [
      [2, "postgres"], [2, "nodejs"],
      [3, "security"], [3, "nodejs"],
      [4, "nodejs"],
      [5, "postgres"],
    ] as const;
    for (const [postId, name] of links) {
      const tag = await prisma.tag.findUniqueOrThrow({ where: { name } });
      await prisma.postTag.create({ data: { postId, tagId: tag.id } });
    }

    const commentBodies: Array<[number, string]> = [
      ...Array.from({ length: 3 }, (_, i) => [2, `c${i}`] as [number, string]),
      ...Array.from({ length: 5 }, (_, i) => [3, `c${i}`] as [number, string]),
      [4, "c0"],
      [5, "c0"], [5, "c1"],
    ];
    for (const [postId, body] of commentBodies) {
      await prisma.comment.create({ data: { postId, body } });
    }

    // GOTCHA (worth remembering): inserts with EXPLICIT ids do not advance
    // the underlying sequences — sync them or the first autoincrement create
    // in a test collides with fixture ids.
    for (const table of ["Post", "Tag", "Comment"]) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`,
      );
    }
  });

  describe("createPostWithTags", () => {
    it("creates a post and attaches existing + new tags in one transaction", async () => {
      const result = await createPostWithTags(prisma, {
        title: "RAG with pgvector",
        authorId: 1,
        tagNames: ["postgres", "ai"], // postgres exists, ai is new
      });

      expect(result.title).toBe("RAG with pgvector");
      expect(result.published).toBe(false);
      expect(result.tags.map((j) => j.tag.name).sort()).toEqual(["ai", "postgres"]);
    });

    it("is idempotent about tag rows across repeated runs", async () => {
      for (let i = 0; i < 2; i++) {
        await createPostWithTags(prisma, {
          title: `Run ${i}`,
          authorId: 2,
          tagNames: ["kafka", "kafka"], // even duplicated input must not explode
        });
      }
      expect(await prisma.tag.count({ where: { name: "kafka" } })).toBe(1);
    });

    it("rolls back EVERYTHING when a failure is injected after the post step", async () => {
      await expect(
        createPostWithTags(prisma, {
          title: "Doomed Draft",
          authorId: 3,
          tagNames: ["brand-new-tag"],
          __failAt: "after-post",
        }),
      ).rejects.toThrow("injected failure");

      expect(await prisma.post.count({ where: { title: "Doomed Draft" } })).toBe(0);
    });

    it("rolls back tag upserts when the failure lands after them", async () => {
      const tagsBefore = await prisma.tag.count();

      await expect(
        createPostWithTags(prisma, {
          title: "Doomed Tags",
          authorId: 3,
          tagNames: ["never-survives"],
          __failAt: "after-tags",
        }),
      ).rejects.toThrow("injected failure");

      expect(await prisma.tag.count()).toBe(tagsBefore);
      expect(await prisma.post.count({ where: { title: "Doomed Tags" } })).toBe(0);
    });
  });

  describe("publishPost", () => {
    it("walks the guarded transition ladder without throwing", async () => {
      await expect(publishPost(prisma, 999)).resolves.toEqual({
        ok: false,
        reason: "not-found",
      });

      const first = await publishPost(prisma, 1);
      expect(first).toEqual({ ok: true, post: expect.objectContaining({ id: 1, published: true }) });

      await expect(publishPost(prisma, 1)).resolves.toEqual({
        ok: false,
        reason: "already-published",
      });
    });
  });

  describe("publishedWithCommentCounts", () => {
    it("returns published posts ordered by comment count desc, then id", async () => {
      expect(await publishedWithCommentCounts(prisma)).toEqual([
        { id: 3, title: "JWT Deep Dive", commentCount: 5 },
        { id: 2, title: "Cache Patterns", commentCount: 3 },
        { id: 5, title: "Indexes Demystified", commentCount: 2 },
        { id: 4, title: "Streams 101", commentCount: 1 },
      ]);
    });
  });

  describe("moveComments", () => {
    it("bulk-moves comments inside one transaction and returns the count", async () => {
      const moved = await moveComments(prisma, 3, 2);

      expect(moved).toBe(5);
      expect(await prisma.comment.count({ where: { postId: 3 } })).toBe(0);
      expect(await prisma.comment.count({ where: { postId: 2 } })).toBe(8);
    });

    it("leaves everything untouched when either post is missing", async () => {
      await expect(moveComments(prisma, 3, 999)).rejects.toMatchObject({
        code: "post-not-found",
      });
      await expect(moveComments(prisma, 777, 2)).rejects.toBeInstanceOf(DomainError);

      expect(await prisma.comment.count({ where: { postId: 3 } })).toBe(5);
    });
  });
});
