# Phase 09 — Senior craft (~3 weeks)

**Outcome:** operate at senior altitude: write RFCs that get alignment, model aggregates that keep invariants honest, run code reviews that teach (and catch what matters), lead incident response with blameless postmortems — and walk into interviews with stories extracted from your own build log.

## How this phase works

Writing- and judgment-heavy by design. Two topics include machine-checkable pieces:

| Topic | Grading mechanism |
|---|---|
| [01-design-docs-rfcs](01-design-docs-rfcs/) | RFC on a template + self-scored rubric |
| [02-ddd-tactical](02-ddd-tactical/) | **Autograded** `Money`/`Order` aggregate + written boundary analysis |
| [03-code-review-craft](03-code-review-craft/) | Review THREE planted-flaw diffs; specs check you caught the right things |
| [04-incidents-postmortems](04-incidents-postmortems/) | Postmortem from a fictional outage timeline; structure + blameless-language checked |
| [05-interviewing-mastery](05-interviewing-mastery/) | Rubric self-assessment + STAR story bank from YOUR repo retros |

## Anchor free resources

- [Google design docs tradition](https://www.industrialempathy.com/post/design-docs-at-google/) · [Fowler — DDD tagged posts](https://martinfowler.com/tags/domain%20driven%20design.html)
- [PagerDuty Incident Response handbook](https://response.pagerduty.com/) · [Joel Spolsky's essays](https://www.joelonsoftware.com/)
- [SmartBear — best practices for peer code review](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) (free guide)

## Done means

- [ ] All three coded/checked topics green (`pnpm test:topic 09-senior-craft/…`)
- [ ] One real RFC committed and self-reviewed against the checklist
- [ ] Postmortem contains zero blame-language (the spec enforces it)
- [ ] Six STAR stories drafted from THIS repo's war rooms
