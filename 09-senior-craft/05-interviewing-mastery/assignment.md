# Assignment — interview-prep.md

**Deliverable:** `interview-prep.md` in this folder
**Graded by:** [prep.spec.ts](prep.spec.ts) (structure) + honest self-assessment

## Section 1 — System-design self-assessment (/25)

Re-read your phase-05 URL-shortener doc. Score it against the template rubric honestly, then write:
- the two weakest axes and WHY points were lost
- one concrete drill per weak axis you'll run before interviewing

## Section 2 — STAR story bank (6 stories, from THIS repo)

Required story prompts (map to real moments — details in your notes/retros):

1. **Hardest bug** (candidates: DI circular detection, JWT clock-skew, embedded-PG data-dir collision)
2. **A trade-off you'd defend differently now** (djb2→FNV-1a hash swap; coverage-gates placement)
3. **Something you broke and how guardrails saved you** (spec caught my Content-Length math / stream CRLF bug)
4. **Learning something the hard way under constraint** (OTel v2 context propagation)
5. **Helping a “teammate”** — explain ONE topic README to a fictional junior in 5 sentences (pick: outbox pattern)
6. **A decision you reversed** (retry policy semantics; feature-flag default states)

Each story ≤120 words, explicit S-T-A-R labels, with at least one NUMBER as the Result.

## Section 3 — Behavioral question mapping

Map these five common questions to your story numbers: conflict · failure · tight deadline · ambiguity · proudest moment.

## Structure the spec checks

- `## 1.` heading contains "self-assessment"; mentions two weak axes by name
- `## 2.` section has six `### Story N:` blocks, each containing all four STAR labels
- At least four stories contain a digit-bearing result sentence (numbers!)
- `## 3.` maps all five questions to story numbers
