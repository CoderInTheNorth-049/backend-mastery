# Assignment — Saga runner + CQRS projector

## The problem you're solving
Distributed transactions die under locks; sagas replace them with forward steps plus business-level compensations (“refund”, never “un-charge”). Meanwhile reads need shape the write model can't serve — enter CQRS projections. You'll build both halves: a saga orchestrator whose unwind is provably correct, and a watermarked projector that folds events into a read model.

## Your tasks

1. **[src/saga.ts](src/saga.ts) — `runSaga(def, ctx?)`**
   - execute steps in order sharing one mutable ctx
   - first failure stops forward progress: compensate EXECUTED steps in REVERSE order, SKIPPING steps without compensation
   - a throwing compensation must NOT abort the unwind — collect into `compensationErrors`; the ORIGINAL step error wins the report
   - success → `{status:"completed", executed:[names]}`

2. **CQRS trio** (schema auto-created by spec): `appendEvent(pool, {postId, kind, payload})`, `projectOnce(pool)` folding events past the watermark row into `post_summary` inside one transaction (`post.created` upserts title/count 0 · `title.changed` updates · `comment.added` increments, auto-creating rows), returning applied count; `readModel(pool, postId)`.

## Definition of done
- [ ] Saga spec green: reverse unwind order proven, compensation failures collected while unwinding continues, empty saga completes
- [ ] Projector spec green: incremental watermark math, no-op on empty pending, concurrent projections don't double-apply

## Hints (open only when stuck)

<details><summary>Unwind</summary>
Iterate executed steps reversed; try/catch EACH compensation collecting messages. Report original body error regardless of compensation outcomes.</details>

<details><summary>Watermark</summary>
One row in projector_state keyed by model name; COALESCE to 0 on first run; update INSIDE the fold transaction — crash-safe cursor.</details>

## Going further (optional)
Persist saga instances for resume-after-restart; add per-step timeouts via AbortController.