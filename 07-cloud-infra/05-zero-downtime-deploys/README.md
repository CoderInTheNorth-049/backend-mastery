# Topic: Zero-downtime deploys — shipping while users sleep

> **Goal:** Internalize THE rule of production deploys (old and new code run against one database simultaneously) and the strategy menu for honoring it. Deliverable: a rollout plan for a genuinely breaking change.

## Beginner-friendly picks

- 📝 [Fowler — BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html) + [CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html) — two-page classics
- 🎥 YouTube search: **“blue green deployment vs canary”** — comparison animations

## Core concepts

| Strategy | Shape | Wins | Costs | Use when |
|---|---|---|---|---|
| Rolling | replace pods batch-by-batch behind LB | zero extra capacity; simple | two versions coexist during roll; slower full rollout | default for stateless services |
| Blue-green | full parallel env, flip traffic at proxy | instant rollback (flip back); clean env parity | 2× capacity during window; DB still shared! | big risky releases w/ infra budget |
| Canary | route 1%→5%→25%→100% to new version | real-traffic validation with tiny blast radius; metrics-driven promotion | needs traffic-splitting + good metrics; slow | high-traffic user-facing APIs |
| Shadow/mirror | copy live traffic to new version, discard responses | validates under REAL load with zero user risk | double compute; write-path side effects need taming | pre-cutover confidence for risky rewrites |

## Core concepts continued

| Concept | Must be able to answer | Free resources |
|---|---|---|
| The golden deploy rule | N and N+1 code must both work against schema S — every migration starts EXPANDING | [expand-contract pattern](https://martinfowler.com/articles/evodb.html) |
| Expand → migrate → contract | add nullable/new table → dual-write+backfill → switch reads → drop old. Each phase ships independently | Fowler EvolvingDB above |
| Health-gated rollouts | readiness probes + error-rate metrics decide "batch OK"; auto-halt on breach | phase 02/04 recap wired together |
| Rollback reality | code rollback is easy ONLY if migrations were backward-compatible — that's why the rule exists | your assignment |
| Feature flags as deploy decoupling | deploy ≠ release: dark-launch behind flags, enable progressively | [Fowler — feature toggles](https://martinfowler.com/articles/feature-toggles.html) |

## Keep in mind

- **Downtime is a choice made weeks earlier** — at migration-writing time, not deploy time.
- **Two-version tolerance defines your API discipline**: additive changes free; breaking ones NEED expand/contract or versioned endpoints.
- **Canary without metrics is just a smaller outage** — wire p95/error-rate dashboards BEFORE first canary step.
- **Blue-green doesn't solve data**: both blues and greens hammer the same Postgres. Schema compatibility rules still apply.
- **Rollback drills beat rollback plans** — rehearse until "revert" is one command everyone trusts.

## Self-check quiz

<details><summary>1. Migration renames column <code>name</code> → <code>full_name</code>. Zero-downtime sequence?</summary>
ADD full_name; dual-write both columns (trigger or app); backfill; switch reads to full_name; stop writing name; DROP name. Five shippable steps.</details>

<details><summary>2. Why must backfill be batched + resumable rather than one UPDATE?</summary>
One giant UPDATE = long transactions, replication lag spikes, lock queues. Batch by id-range with checkpointing; throttle to replica-lag budget.</details>

<details><summary>3. Canary looks healthy at 5% but you're worried about rare flows. Options?</summary>
Targeted canary: route specific header/tenant cohorts; shadow-compare responses offline; extend bake time watching per-flow metrics, not global averages.</details>

<details><summary>4. Your blue-green flip broke everything instantly. What did blue-green NOT protect?</summary>
The database (shared!) and any non-reversible migration. Flip-back restores old CODE only if old code tolerates NEW schema — expand/contract makes that true.</details>

## Assignment — written deliverable `deploy-plan.md`

Scenario: your phase-02 users API must rename `users.name` → `users.full_name`, change its JSON field accordingly, and ship weekly — with 50k DAU and zero downtime allowed (/20):

1. **Strategy pick** for three orgs (solo founder / scale-up / bank-grade) with one-sentence justification each (/6)
2. **Expand→migrate→contract plan** for the rename: every phase as a separately-shippable PR description incl. verification step (/8)
3. **Failure drills**: what you monitor during each phase; exact rollback action per phase (/4)
4. One paragraph: where feature flags would substitute for a code-level phase (/2)

Self-score vs rubric; commit at ≥16.

### Rubric

| Criterion | Points |
|---|---|
| Strategies matched to org constraints, not fashion | /6 |
| All FIVE rename phases present & ordered correctly | /5 |
| Each phase independently shippable + verifiable | /3 |
| Monitoring signals named per phase (not generic "watch logs") | /4 |
