# Topic: Incidents & postmortems — turning bad nights into durable fixes

> **Goal:** Read a realistic outage timeline, then produce a blameless postmortem that a staff engineer would sign off: quantified impact, contributing factors (not culprits), and owned action items. A spec enforces structure AND blameless language.

## Beginner-friendly picks

- 📝 [PagerDuty Incident Handbook](https://response.pagerduty.com/) — the free book this whole topic borrows from
- 🎥 YouTube search: **“blameless postmortem example”** — several real-company walkthroughs

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Severity ladder | SEV1 = customer-facing revenue loss; SEV3 = internal annoyance. Declared severity drives comms cadence | [PagerDuty — severity levels](https://response.pagerduty.com/before/severity_levels/) |
| Roles | Incident Commander (coordination), Comms lead, Investigator(s) — one person CANNOT do all three well | PagerDuty handbook |
| Timeline discipline | timestamps in UTC, from ALERTS not memories; detection→mitigation→resolution splits | your assignment's timeline |
| Contributing factors ≠ root cause | "root cause: typo" is where learning dies; ask why each guardrail was absent | [Erik Hollnagel — safety thinking] via PagerDuty pages |
| Action items | specific, owned, prioritized, VERIFIABLE — "add more tests" is a wish, not an action | PagerDuty postmortems section |

## Keep in mind

- **Blameless ≠ consequence-free**: it targets SYSTEM failures, not accountability for learning. "Dave forgot" teaches nothing; "the deploy tool had no dry-run mode" prevents the next Dave moment.
- **Write the postmortem while context is warm** — within 48h or the timeline becomes fiction.
- **Impact needs units**: minutes × affected users × error rate. "Site was down-ish" doesn't quantify customer pain.
- **Every action item gets an owner and a due date**, else it's a wish list.
- Mitigation BEFORE diagnosis in the moment; diagnosis BEFORE prevention afterwards. Never debug prod with users watching if a rollback stops the bleeding.

## Self-check quiz

<details><summary>1. Why forbid individual names/blame in postmortems?</summary>
People hide information when blame is possible — you get thinner timelines and repeated incidents. Systems produce outcomes; fix systems to change behavior.</details>

<details><summary>2. Alert fired 25 min AFTER users reported issues. Which number goes in “time to detect”?</summary>
User-report time. Detection lag vs first-impact is itself a finding (your monitoring missed real symptoms).</details>

<details><summary>3. Two action items both say “improve testing”. Fix them.</summary>
Make them verifiable: “Add contract test asserting retry idempotency-key reuse — owner @me — by Mar 14”.</details>

## Assignment

[assignment.md](assignment.md) — read the provided outage timeline; write `postmortem.md` on the given template. The spec checks required sections, key numbers extracted correctly, and ZERO blame-language matches.
