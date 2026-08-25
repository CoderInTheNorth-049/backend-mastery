# Assignment — The blog repository layer (transactions you can prove)

## The problem you're solving
A publishing platform needs its data layer to guarantee three uncomfortable things: creating a post WITH its tags either fully happens or fully doesn't; a post can't be published twice by accident; and comment counts stay honest under concurrent edits. You'll build the repository layer over real PostgreSQL and PROVE the guarantees with injected failures — not hopes.

## Your tasks
Implement in [src/repo.ts](src/repo.ts) (schema is GIVEN in `03-databases/prisma/schema.prisma`):

1. **`createPostWithTags(db, input)`** — inside ONE `db.$transaction(async tx => …)`:
   - create the post
   - if `input.__failAt === "after-post"` → throw `"injected failure: after-post"` (test seam!)
   - upsert each tag by unique name (create if missing, reuse otherwise)
   - if `__failAt === "after-tags"` → throw `"injected failure: after-tags"`
   - connect all tags to the post
   - return the post INCLUDING tags (`tags: [{ …, tag }]` join rows)
2. **`publishPost(db, postId)`** → `{ ok: true, post }` or `{ ok: false, reason: "not-found" | "already-published" }`. Expected outcomes are VALUES, not throws.
3. **`publishedWithCommentCounts(db)`** — published posts as `{ id, title, commentCount }`, ordered commentCount DESC then id ASC. Use `_count` aggregation.
4. **`moveComments(db, fromPostId, toPostId)`** — in ONE transaction: if either post is missing throw `DomainError("post-not-found", …)` (export the class!); otherwise bulk-move comments via `updateMany` and return the moved count.

## Definition of done
- [ ] `pnpm test:topic 03-databases/02-postgres-prisma` green — including BOTH rollback tests (nothing persisted after injected failures)
- [ ] Rollback comes from the TRANSACTION, not from try/catch cleanup
- [ ] Zero `$queryRaw` in your solution

## Hints (open only when stuck)

<details><summary>Upsert shape</summary>
<code>tx.tag.upsert({ where: { name }, create: { name }, update: {} })</code> — empty update reuses the row untouched.
</details>

<details><summary>Count ordering</summary>
<code>orderBy: [{ comments: { _count: "desc" } }, { id: "asc" }]</code> plus <code>_count: { select: { comments: true } }</code>.
</details>

## Going further (optional)
Make `addTagToPost` safe under two concurrent callers (catch Prisma's P2002 unique-violation and retry once).
