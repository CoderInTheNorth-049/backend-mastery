import type { Post, PrismaClient, Tag } from "@prisma/client";

/** Thrown for domain violations callers should translate into 4xx responses. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface CreatePostInput {
  title: string;
  authorId: number;
  published?: boolean;
  tagNames: string[];
  /** TEST SEAM — spec injects mid-transaction failures here. */
  __failAt?: "after-post" | "after-tags";
}

export type PostWithTags = Post & {
  tags: Array<{ postId: number; tagId: number; tag: Tag }>;
};

export type PublishResult =
  | { ok: true; post: Post }
  | { ok: false; reason: "not-found" | "already-published" };

export function createPostWithTags(
  db: PrismaClient,
  input: CreatePostInput,
): Promise<PostWithTags> {
  const { title, authorId, published = false, tagNames, __failAt } = input;

  // Interactive transaction: every statement below shares one fate.
  return db.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: { title, authorId, published },
    });

    if (__failAt === "after-post") {
      throw new Error("injected failure: after-post");
    }

    const tags: Tag[] = [];
    for (const name of tagNames) {
      const tag = await tx.tag.upsert({
        where: { name },
        create: { name },
        update: {}, // reuse existing row untouched
      });
      if (!tags.some((t) => t.id === tag.id)) tags.push(tag);
    }

    if (__failAt === "after-tags") {
      throw new Error("injected failure: after-tags");
    }

    await tx.post.update({
      where: { id: post.id },
      data: { tags: { create: tags.map((tag) => ({ tagId: tag.id })) } },
    });

    return tx.post.findUniqueOrThrow({
      where: { id: post.id },
      include: { tags: { include: { tag: true } } },
    }) as Promise<PostWithTags>;
  });
}

export async function publishPost(
  db: PrismaClient,
  postId: number,
): Promise<PublishResult> {
  const existing = await db.post.findUnique({ where: { id: postId } });
  if (!existing) return { ok: false, reason: "not-found" };
  if (existing.published) return { ok: false, reason: "already-published" };

  const post = await db.post.update({
    where: { id: postId },
    data: { published: true },
  });
  return { ok: true, post };
}

export async function publishedWithCommentCounts(
  db: PrismaClient,
): Promise<Array<{ id: number; title: string; commentCount: number }>> {
  const rows = await db.post.findMany({
    where: { published: true },
    orderBy: [{ comments: { _count: "desc" } }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      _count: { select: { comments: true } },
    },
  });

  return rows.map((r) => ({ id: r.id, title: r.title, commentCount: r._count.comments }));
}

export async function moveComments(
  db: PrismaClient,
  fromPostId: number,
  toPostId: number,
): Promise<number> {
  return db.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.post.findUnique({ where: { id: fromPostId }, select: { id: true } }),
      tx.post.findUnique({ where: { id: toPostId }, select: { id: true } }),
    ]);

    if (!from || !to) {
      throw new DomainError("post-not-found", `missing post(s): ${from ? "" : fromPostId} ${to ? "" : toPostId}`);
    }

    const result = await tx.comment.updateMany({
      where: { postId: fromPostId },
      data: { postId: toPostId },
    });
    return result.count;
  });
}
