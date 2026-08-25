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
  throw new Error("TODO: implement createPostWithTags");
}

export function publishPost(db: PrismaClient, postId: number): Promise<PublishResult> {
  throw new Error("TODO: implement publishPost");
}

export function publishedWithCommentCounts(
  db: PrismaClient,
): Promise<Array<{ id: number; title: string; commentCount: number }>> {
  throw new Error("TODO: implement publishedWithCommentCounts");
}

export async function moveComments(
  db: PrismaClient,
  fromPostId: number,
  toPostId: number,
): Promise<number> {
  throw new Error("TODO: implement moveComments");
}
