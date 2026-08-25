# Phase 05 — System design (~6 weeks)

**Outcome:** reason about scale out loud with numbers: load balancers, caches, CDNs, sharding, CAP/PACELC trade-offs, microservice boundaries — then whiteboard the five classic designs fluently enough to survive a senior loop.

## Beginner-friendly picks

- 🎥 [ByteByteGo (YouTube)](https://www.youtube.com/@ByteByteGo) — animated system-design shorts; perfect pre-reads
- 🎥 [Gaurav Sen (YouTube)](https://www.youtube.com/@gkcs) — full design walkthroughs incl. interview framing

## How this phase works

It's deliberately **writing-heavy**. Design skill grows from producing artifacts under constraints, not from watching videos. Coding assignments shrink to two sharp exercises (cache math, consistent hashing) + one diagram validator; everything else is graded-by-rubric prose you commit and revisit.

The engine room of the phase is [`07-classic-designs`](07-classic-designs/): one shared [template](07-classic-designs/template.md), five prompts, and a repeat practice loop (record yourself, watch it back, cringe, repeat).

## Topics

| Folder | Est. | You produce |
|---|---|---|
| [01-scaling-primitives](01-scaling-primitives/) | 4 days | Back-of-envelope estimates + LB/statelessness strategy notes |
| [02-caching-cdns](02-caching-cdns/) | 4 days | HTTP freshness evaluator + TTL jitter + cache-key builder (autograded) |
| [03-database-scaling](03-database-scaling/) | 5 days | A working **consistent-hash ring** (autograded) + sharding notes |
| [04-cap-pacelc](04-cap-pacelc/) | 4 days | Consistency decision matrix + quorum math |
| [05-microservices-monolith](05-microservices-monolith/) | 4 days | Your first real ADR: extracting a feed service |
| [06-api-paradigms](06-api-paradigms/) | 3 days | Paradigm selection matrix across six scenarios |
| [07-classic-designs](07-classic-designs/) | 12 days | Five full design docs on the shared template + mermaid validator |

Parallel track: **[Capstone 1 — URL Shortener](../capstones/01-url-shortener/project-brief.md)** starts NOW; its [build guide](../capstones/01-url-shortener/build-guide.md) maps every milestone to phases 02–08 skills.

## Anchor free resources

- [System Design Primer](https://github.com/donnemartin/system-design-primer) · [karanpratapsingh/system-design](https://github.com/karanpratapsingh/system-design)
- [Martin Fowler — microsites](https://martinfowler.com/) (monolith-first, BLUB) · [microservices.io patterns](https://microservices.io/)
- [Use The Index, Luke](https://use-the-index-luke.com/) for sharding-vs-index framing · [High Scalability classics](http://highscalability.com/)
- Latency numbers every engineer should memorize are linked inside topic 07's template.

## Done means

- [ ] All three coded specs green (`pnpm test:topic 05-system-design/…`)
- [ ] Five design docs committed, each self-scored ≥ threshold on its rubric
- [ ] You recorded one 35-minute mock design and watched it back (checkpoint from ROADMAP)
- [ ] Capstone 1 milestones M0–M2 complete
