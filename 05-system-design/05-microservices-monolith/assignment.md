# Assignment — ADR: should RecipeShare extract its feed service?

## The problem you're solving
RecipeShare is a modular monolith whose feed queries now take p95 900ms at peak, fighting recipe writes for the same tables. The ML team wants daily deploys the weekly platform cadence can't give them. Everyone shouts “microservices!” — your job as the senior voice is to write the ADR that decides it like an adult: options weighed, consequences owned, migration revertible.

## Your tasks
Write `adr-001-feed-service.md` using the section structure below:

1. **Context** — restate the pressures WITH the numbers above (p95, cadences, contention).
2. **Options considered** (≥3): must include “do nothing / tune indexes” argued as seriously as extraction.
3. **Decision** — one unambiguous sentence.
4. **Consequences** — what data moves and who owns it afterward; the NEW consistency model you now support (feed staleness bound? read-your-own-write strategy?).
5. **Migration plan** — strangler steps, each independently verifiable and revertible.
6. **Rollback** — covers the backfill window, not just cutover day.

## Definition of done
- [ ] Numbers appear in Context (no adjective-only claims)
- [ ] Do-nothing option gets equal rigor
- [ ] Data ownership + consistency model explicit
- [ ] Strangler steps each revertible
- [ ] Self-scored ≥16/20 on the README rubric

## Going further (optional)
Sketch the event contract (`feed.rank-changed`) you'd need if ranking moves too — schema + delivery guarantee.