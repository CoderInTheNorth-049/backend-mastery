# Assignment — blameless postmortem for the checkout outage

**Deliverable:** `postmortem.md` in this folder, on [postmortem-template.md](postmortem-template.md), from [incident-timeline.md](incident-timeline.md)
**Graded by:** [postmortem.spec.ts](postmortem.spec.ts)

## Requirements

1. **Impact section** carries the four key numbers from the timeline (duration, peak 5xx %, failed attempts, affected users).
2. **Contributing factors ≥ 5**, each naming a SYSTEM gap (change management, missing timeout, missing test, observability gap, cross-team comms) — never a person.
3. **Timeline table** includes at least: deploy completion, first alert, mitigation, resolution — with correct UTC times.
4. **Action items ≥ 4**, each with owner placeholder, priority, and a verifiable acceptance ("add contract test asserting X" beats "improve testing").
5. **Blameless language enforced**: no matches for /forgot|careless|his fault|her fault|should have been more careful|negligent/i.

## Hints

<details><summary>Factor seeds (pick ≥5, phrase as system gaps)</summary>
No client timeout on recommendations call · flag shipped default-ON without canary · no integration test for dependency-unreachable path · no cross-service latency dashboard · silent migration by another team (no change-freeze/announcement channel) · pool exhaustion had no early-warning alert.
</details>

## Acceptance criteria

- [ ] Spec green
- [ ] You'd be comfortable if the customer who tweeted during the outage read this
