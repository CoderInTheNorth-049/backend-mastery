# Topic: Design docs & RFCs — writing that aligns people

> **Goal:** Produce a decision document that a skeptical senior can approve in ten minutes. RFCs are how senior engineers multiply judgment beyond their own keyboard.

## Beginner-friendly picks

- 📝 [Industrial Empathy — Design Docs at Google](https://www.industrialempathy.com/post/design-docs-at-google/) — the canonical culture writeup; skim before the template
- 🎥 YouTube search: **“how to write a design doc”** — several staff-engineer walkthroughs

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Design doc vs RFC | doc = full solution space for builders; RFC = focused DECISION proposal for reviewers — you'll practice both across phases 05/09 | [RFC concept origins](https://www.ietf.org/rfc/rfc2119.txt) framing + Google doc post above |
| Audience-first writing | who reads it, what do THEY need to decide? Everything else gets cut | [Julia Evans — write what you mean](https://jvns.ca/blog/writing-about-your-research/) general writing craft |
| Options with teeth | ≥3 real options; "do nothing" argued honestly; trade-off tables beat prose walls | phase-05 ADR recap |
| Consequences both ways | every decision buys something and pays something — name both currencies | your flagship briefs |
| Rollout & rollback as sections, not afterthoughts | reviewers trust plans they can revert | strangler-fig recap |

## Keep in mind

- **Shorter is harder and better**: if a busy principal can't decide from your doc in 10 minutes, it's not done.
- **Disagree-and-commit needs a record** — the doc IS the record that lets teams move fast AFTER disagreement.
- **Write the rollback section first** if the change touches data or traffic.
- Numbers > adjectives: "p95 900ms → target <300ms" tells readers you measured.

## Self-check quiz

<details><summary>1. Your RFC got five “LGTM” comments with no questions. Good sign?</summary>
Usually NO — it means nobody engaged. Tag specific reviewers per section, ask explicit open questions, or shrink the blast radius until review is cheap.</details>

<details><summary>2. When should an RFC be abandoned mid-process?</summary>
When new facts invalidate a core assumption (better option appeared, constraint died). Marking Superseded/Rejected IS a successful outcome — docs are decision records, not trophies.</details>

<details><summary>3. What belongs in Context vs Consequences?</summary>
Context: facts that exist BEFORE your decision (constraints, incidents, numbers). Consequences: world-states AFTER adoption, positive and negative.</details>

## Assignment

[assignment.md](assignment.md) — write an RFC on the provided template for a scenario pulled from THIS repo's own roadmap decisions. Self-scored /20; structure spot-checked by spec.
