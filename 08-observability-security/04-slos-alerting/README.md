# Topic: SLOs & alerting — budgets, not vibes

> **Goal:** Turn "the site should be reliable" into arithmetic you can defend: error budgets from SLO targets, burn rates against thresholds, and alert policies that don't cry wolf. Pure functions — because this topic is about REASONING, not tooling.

## Beginner-friendly picks

- 📝 [SRE workbook — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) — where the 14.4× number lives; read after passing

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| SLI vs SLO | SLI = the measurement (success ratio); SLO = the target over a window ("99.9% of requests succeed over 30d") | [Google SRE ch.4](https://sre.google/sre-book/service-level-objectives/) |
| Error budget | allowed failures = total × (100 − SLO)% — the amount of imperfection you may SPEND on change | [SRE ch.3 — embrace risk](https://sre.google/sre-book/embracing-risk/) |
| Burn rate | how fast you consume budget vs expected pace: observed error rate ÷ budget rate. 1.0 = exactly on schedule | [SRE workbook ch.5](https://sre.google/workbook/implementing-slos/) |
| Multi-window alerts | fast burn (14.4× over 1h) pages; slow burn (1× over days) tickets — catches outages AND slow rot | [workbook — alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) |
| Alert hygiene | every page must be actionable & urgent; everything else → dashboards/tickets. Crying-wolf alerts get ignored at 3 AM | SRE workbook above |

## Keep in mind

- **Pick SLOs slightly below current reality**, then ratchet. A fantasy SLO burns the team; a trivial one decorates dashboards.
- **99.99% sounds noble and costs millions** — each extra nine roughly halves your error budget. Choose per user impact.
- **Burn-rate thresholds come from window math** (e.g., 2% budget in 1h ⇒ 14.4× for a 30d window). Memorize the METHOD, not just the number.
- **Budget exhausted ⇒ feature freeze until reliability work restores it** — otherwise the SLO is fiction.
- Alerts page humans only for things needing HUMAN timing. Auto-remediation handles the rest.

## Self-check quiz

<details><summary>1. SLO 99.9%, 30-day window, 50M requests. Budget size?</summary>
50M × 0.1% = 50k failed requests allowed. Everything else (deploys, migrations, incidents) draws from these 50k.</details>

<details><summary>2. You've burned 60% of budget in 10% of the window. Burn rate & verdict?</summary>
6× expected pace — trending toward exhaustion ~5× early. Verdict: slow-burn ticket + investigate top contributors; not yet a page.</details>

<details><summary>3. Why pair a 1h/5m fast-burn alert WITH a 3d/6h slow-burn alert?</summary>
Fast windows catch sudden cliffs quickly but miss gradual rot; long windows catch rot with low noise but react late. Together they cover both failure shapes.</details>

## Assignment

[assignment.md](assignment.md) — implement `allowedErrorCount`, `remainingBudget`, `computeBurnRate`, and `isAlerting`. The numbers are the interview answers; make them exact.
