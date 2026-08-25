# Assignment — Scaling notes for a podcast platform

## The problem you're solving
A podcast startup just crossed 3M daily listeners and the founder wants “a real infrastructure plan” by Friday. Vague answers die in this meeting. You'll practice turning DAU figures into storage, RPS, and load-balancer decisions that survive a skeptical staff engineer asking **“show me how you got that number.”**

## Your tasks
Create `scaling-notes.md` in this folder with three sections:

1. **Estimates** — given: 3M DAU · 40 min/day listening @128 kbps · 0.5% of DAU upload daily @50MB · peak factor 2.5×.
   Produce a table: daily egress (GB) · peak stream load (state your request-model assumption) · daily upload storage · uploads/month object count.
2. **Load-balancer choices** — one paragraph each, naming the algorithm AND the failure mode you're avoiding:
   a) REST fleet where endpoint costs vary 1ms–2s
   b) WebSocket gateway holding 100k long-lived connections
   c) Cache-tier lookups where key→node stability prevents misses
3. **Statelessness migration plan** — legacy app: sticky sessions in local `/tmp/sess`, uploads on local disk `./uploads`, behind naive round-robin.
   Ordered plan to reach stateless instances with ZERO downtime and zero lost sessions/uploads: destination per state type, verification BEFORE removing stickiness, rollback procedure + its consistency caveat.

## Definition of done
- [ ] Every number shows its unit conversions explicitly (DAU ÷ 86,400 etc.)
- [ ] Peak factor stated as an assumption, not hidden
- [ ] LB picks match the failure modes from the README quiz
- [ ] Migration plan orders state-extraction before the sticky removal, with rollback caveats

## Self-scoring
/15 rubric breakdown lives at the bottom of [README.md](README.md). Commit at ≥12.

## Going further (optional)
Add a cost line-item estimate (egress $/GB, storage $/GB-mo) and identify which single number dominates the bill.