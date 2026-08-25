# Assignment — Three reviews, graded on what you catch

## The problem you're solving
Reading code is easy; REVIEWING it — spotting the concurrency bug, the memory blow-up, the security hole hiding behind clean formatting — is a senior skill built by reps. Three PR diffs contain deliberately planted flaws. Your reviews get machine-graded: did you flag the right SYMBOLS with the right CATEGORY TAGS?

## Your tasks
For each diff in [diffs/](diffs/), write a review file in `reviews/submission/` (`pr-1.md`, `pr-2.md`, `pr-3.md`):

1. **pr-1-retry** — a payment retry helper. Flag the duplicate-charge risk on timeout-after-success around `chargeWithRetry` `[correctness]`, and the five-executions-not-five-retries semantics of `MAX_RETRIES` `[concurrency]`.
2. **pr-2-export** — a batched user export. Flag the pagination math mismatch with variable batch sizes (`page * 1000`) `[correctness]`, and `countAll(Infinity)` materializing the whole table for one number `[performance]`.
3. **pr-3-reset** — a password-reset flow. Flag the broken `node:crypto` import / token entropy via `randomUUID`, the in-memory `tokens` Map across instances, and user enumeration in `requestReset` — all `[security]`.

Every review: summary paragraph → numbered findings (each with `[category]` tag + the planted symbol nearby + why-it-matters + suggested fix + severity) → at least one genuinely positive note.

## Definition of done
- [ ] Spec green: every plant caught with its symbol AND category tag within the same comment window
- [ ] Each review ≤120 lines but specific enough that the author knows exactly what to change

## Hints (open only when stuck)

<details><summary>Tag placement</summary>
The grader checks symbol+tag proximity (~400 chars), so put the tag IN the finding heading or first sentence — not buried in a later paragraph.</details>

## Going further (optional)
Review a fourth diff of your OWN phase-02 code as if a stranger wrote it — self-review counts double.
