# Career guide — frontend → senior backend

## Positioning (the honest version)

You are not "competing" with career backend engineers on their turf; you're selling a rarer combo:

> **Product engineer with real backend systems depth** — can own a feature end-to-end: React UI → API design → data model → distributed-systems correctness.

Target companies where that's valuable: product-led startups/scale-ups, platform teams, full-stack roles at mid-size tech cos, and big-tech L4/L5-adjacent roles after 1–2 years of backend ownership. "Senior" titles don't transfer 1:1 — optimize for scope and learning velocity first.

## Resume: bullet formula

```
Built <system> that <capability>, handling <scale/constraint>, using <technique>, measured by <number>
```

Weak: *"Built a webhook service using Node.js and Redis."*
Strong: *"Built multi-tenant webhook delivery platform (NestJS/Kafka/Postgres): idempotent retries w/ exponential backoff + DLQs, HMAC-signed payloads; sustains 2k deliveries/min in k6 load tests; 78% coverage enforced in CI."*

Rules:

1. Every bullet must survive ~10 minutes of follow-up questions. If it can't, cut it or build the missing depth (this repo is designed so it can).
2. Numbers beat adjectives. No scale? Generate it: load-test reports committed in-repo count as evidence.
3. Two flagship repos > six toy CRUD apps. Link architecture diagram sections directly.

## Interview loop anatomy (typical product/big-tech)

| Round | What they probe | Where this repo prepares you |
|---|---|---|
| Coding (DS&A) | problem decomposition, clean code | keep light LeetCode habit alongside; backend role ≠ hard DP, focus arrays/hashmaps/trees/graphs basics |
| Practical/backend coding | real-world API/db code review | phases 01–03 assignments mirror these take-homes |
| System design | trade-off reasoning under ambiguity | phase 05 + flagship architecture stories |
| Behavioral | conflict, failure, ownership stories | your capstone retros = STAR material bank |

## System design interviews (senior gatekeeper)

Practice loop (start after phase 05):

1. Pick prompt (URL shortener, rate limiter, news feed — classic list in `05-system-design`).
2. 40 minutes recorded, whiteboard-style notes.
3. Self-review against a reference solution (free resources listed in phase README).
4. Repeat same prompt 2 weeks later. Depth > quantity: ~10 prompts done properly beats 50 skimmed.

## Story bank (STAR)

Maintain `career/stories.md`. After each phase, add 2–3 stories:
- hardest bug (your DI circular-dependency hunt, JWT clock-skew heisenbug…)
- a trade-off decision you'd defend differently now
- something you broke in CI and how the guardrail helped

Interviewers remember specifics. This repo manufactures specifics.

## Open-source leverage

After flagships stabilize: extract reusable pieces into small published packages (e.g., outbox-pattern helper, webhook-signing lib). Even 20-star packages demonstrate senior-grade engineering judgment: semver discipline, changelogs, docs.

## Timeline sanity

- Months 0–5: phases 00–05 → start applying to **mid-level backend / senior full-stack** roles to calibrate market signal early.
- Months 5–10: flagships + phases 06–10 → apply upward; referrals convert far better than cold applies — share your flagship write-ups (blog posts) where engineers hang out.

A blog series documenting flagship builds ("Designing idempotent webhook delivery") is itself resume evidence — publish on your own domain or dev.to (free).
