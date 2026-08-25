# Topic: Code review craft — catching what matters, teaching while you do it

> **Goal:** Review three PR-style diffs with deliberately planted flaws across correctness, concurrency, security, and tests. A spec verifies you caught the RIGHT things (by symbol + category tag) — the same way review-coverage is measured on real teams.

## Beginner-friendly picks

- 📝 [SmartBear — best practices for peer review](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) — keep reviews <400 lines; the data behind it
- 🎥 YouTube search: **“code review best practices”** — several staff-engineer talks

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Review by risk class | correctness/concurrency/security/tests/readability — scan for EACH class deliberately | [Google — how to do a code review](https://google.github.io/eng-practices/review/) |
| The reviewer's checklist instinct | missing await? error path tested? new input validated? naming honest? | Google review doc above |
| Comments that teach | ask "what does this do when X?" instead of verdicts; suggest > command | [Google — review comments](https://google.github.io/eng-practices/review/reviewer/comments.html) |
| Blocking vs nit | label severity (`[blocking]` vs `[nit]`) so authors know what MUST change | Google doc above |
| Your own diffs first | self-review before requesting: catches 50%+ of findings instantly | universal practice |

## Keep in mind

- **Concurrency bugs hide at await boundaries** — every `await` is a yield point where shared state may have moved.
- **The happy path lies.** Reviews ask about the error branch: what happens when the network/DB/payload betrays you?
- **Tests are part of the diff**: untested new branches = incomplete PR, say so kindly.
- **Style nits go to tooling**, not humans. If ESLint would catch it, don't spend a human comment.
- Praise specific good decisions too — reviews teach norms both ways.

## Self-check quiz

<details><summary>1. You find 12 issues in a 300-line PR. Ship all comments at once?</summary>
Yes — one round-trip beats death-by-a-thousand-cycles. But LABEL severities and lead with a summary so the author can triage.</details>

<details><summary>2. Author pushes back on a blocking finding you're sure about. Next move?</summary>
Restate the concrete failure scenario (not taste); if still split, escalate to a third reviewer or team norm doc — not a turf war in the thread.</details>

<details><summary>3. Why check tests BEFORE implementation details?</summary>
If tests encode the intended behavior wrong, "correct" implementation details are irrelevant. Contract first, mechanics second.</details>

## Assignment

[assignment.md](assignment.md) — three planted-flaw diffs await in [diffs/](diffs/). Write reviews into `reviews/submission/`; the grader checks you flagged each plant's symbol AND tagged its category.
