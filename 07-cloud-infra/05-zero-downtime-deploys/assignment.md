# Assignment — zero-downtime rollout plan for a breaking rename

## The problem you're solving
Your users API must rename `users.name` → `users.full_name` (DB column AND JSON field) with 50k DAU and ZERO downtime allowed. The naive path breaks every running client mid-deploy. The senior path is expand→migrate→contract: five independently shippable phases where old and new code always coexist safely.

## Your tasks
Write `deploy-plan.md` in this folder:

1. **Strategy picks** for three orgs — solo founder / scale-up / bank-grade — one-sentence justification each.
2. **Expand→migrate→contract plan** for the rename: every phase as a separately shippable PR description INCLUDING its verification step (add column → dual-write → backfill → switch reads → drop old).
3. **Monitoring + rollback table**: what you watch during each phase and the exact rollback action if it breaches.
4. One paragraph: where a feature flag would substitute for a code-level phase.

## Definition of done
- [ ] All five rename phases present, ordered correctly, each independently revertible
- [ ] Monitoring signals are SPECIFIC (error-rate threshold, replica lag budget) not “watch logs”
- [ ] Self-scored ≥16/20 on the README rubric

## Hints (open only when stuck)

<details><summary>The golden rule</summary>
N and N+1 must both work against schema S. That single constraint generates all five phases.</details>

## Going further (optional)
Draft the same plan for REMOVING a field — contract phase has extra traps (clients caching old responses).

