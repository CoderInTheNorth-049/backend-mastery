# Assignment — Consistency decisions & quorum drills

## The problem you're solving
“CAP theorem says pick 2 of 3” is the rookie answer this topic exists to remove. The senior version: during a partition you choose CP or AP; when there's NO partition you're trading latency vs consistency (PACELC). Six real scenarios force you to make those calls out loud, with numbers behind the quorum math.

## Your tasks
Create `decisions.md` covering:

1. **Six scenario verdicts** — for each, name BOTH regimes (partition-side AND latency-side), pick a concrete tech posture, defend in ≤3 sentences:
   - Banking transfer API (amounts move between accounts)
   - Social "like" counters
   - Shopping cart during Black Friday regional outage
   - Feature-flag service powering fleet-wide kill-switches
   - Chat message ordering within one conversation
   - Session store for logged-in users
2. **Quorum drills** — for N=3 and N=7: list ALL (R,W) pairs where R+W>N; then mark which pair you'd ship for a product-page counter vs an order ledger, and say why they differ.

## Rules
- "CAP doesn't apply here" is forbidden — that's the tell.
- At least one scenario must argue FOR availability over consistency, defended with a bounded-staleness number.

## Definition of done
- [ ] All six verdicts name both regimes with concrete systems/configs
- [ ] Quorum tables are complete and mathematically correct
- [ ] Counter-vs-ledger answers articulate per-operation tuning
- [ ] Self-scored ≥14/18 on the README rubric

## Going further (optional)
Add one row: what changes when the session store must survive a datacenter loss (hint: CRDTs exist for a reason).