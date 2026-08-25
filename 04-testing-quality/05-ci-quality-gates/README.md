# Topic: CI quality gates — making bad merges impossible

> **Goal:** Turn your standards into infrastructure. You'll author a complete GitHub Actions workflow (graded by parsing its YAML), wire coverage reporting into CI, and understand WHY each gate exists before adding it.

## Beginner-friendly picks

- 🎥 YouTube search: **“GitHub Actions tutorial”** — TechWorld-with-Sana & freeCodeCamp versions are solid
- 📝 [GitHub Actions — learn by example](https://docs.github.com/en/actions/automating-builds-and-tests/about-continuous-integration) — CI concepts page behind your assignment

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Gate ladder | format → lint → typecheck → unit → integration → coverage floor — cheapest checks first | [GitHub Actions — workflow syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions) |
| Matrix testing | same suite across Node versions; fail-fast trade-offs | [Actions — matrices](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow) |
| Coverage as policy | thresholds convert "we should test more" into merge-blocking facts; where to set them (hint: slightly below current reality, ratchet up) | [Vitest — coverage config](https://vitest.dev/config/#coverage-thresholds) |
| Concurrency groups | cancel superseded runs on the same branch — save minutes and money | [Actions — concurrency](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-use-of-concurrency) |
| Caching | pnpm store caching via setup-node; why frozen-lockfile belongs in CI | [actions/setup-node](https://github.com/actions/setup-node#caching-dependencies) |
| Artifacts vs caches | artifacts = outputs humans download (coverage HTML); caches = speed inputs | [Actions — dependency caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows) |

## Keep in mind

- **Every gate taxes every developer forever.** A flaky gate costs more than it protects — earn each one, monitor its failure rate.
- **Fail fast, but not falsely**: ordering lint→typecheck→test saves minutes without hiding information.
- **Coverage floors ratchet, never drop**: set at ~current-minus-small-margin, tighten after each improvement push. A floor far below reality is decoration.
- **Your main branch's CI is the team's heartbeat** — red main = everyone stops. Protect it with branch rules that require checks (repo settings, not YAML).
- **Workflow YAML is code**: reviewable, testable (this topic literally grades yours), versioned next to what it guards.

## Self-check quiz

<details><summary>1. Why run lint BEFORE typecheck in the pipeline?</summary>
Seconds vs minutes: style/symbol issues surface fastest, failing the run before expensive compilation. Same reason unit tests precede integration.</details>

<details><summary>2. Your coverage is 63%. Where do you set the floor and why?</summary>
~60% now, ratcheting upward each improvement sprint. A 80% fantasy-floor blocks all merges (team disables CI); a 30% floor decorates READMEs.</details>

<details><summary>3. What breaks when you forget <code>cancel-in-progress</code> on PR runs?</summary>
Queued superseded runs serialize behind stale commits — slow feedback, wasted runners, and humans merging based on OUTDATED check results.</details>

<details><summary>4. Why <code>--frozen-lockfile</code> in CI installs?</summary>
Guarantees the lockfile exactly matches manifest; catches drift at PR time instead of prod deploys. Reproducibility is the whole point of lockfiles.</details>

## Assignment

[assignment.md](assignment.md) — author `.yml` for a lint+test pipeline with a Node matrix, pnpm caching, coverage artifact, and concurrency control. Your file is parsed and structurally graded — valid YAML that does the job, not prose.
