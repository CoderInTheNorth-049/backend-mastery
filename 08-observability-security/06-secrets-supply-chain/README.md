# Topic: Secrets & supply chain — leaks you can catch mechanically

> **Goal:** Write a mini-gitleaks: scan diffs for added credentials before they reach history. Once a secret is pushed it's burned forever (rotate first!), so the only good leak is the one CI blocked.

## Beginner-friendly picks

- 🧪 [gitleaks repo](https://github.com/gitleaks/gitleaks) — compare YOUR pattern table against its production config.toml
- 📝 [npm audit docs](https://docs.npmjs.com/cli/v10/commands/npm-audit) — run it on any project of yours after reading

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Leak lifecycle | push → cached by forges/CDNs/clones ⇒ ROTATE FIRST, then rewrite history. Order matters | [GitHub — secret scanning](https://docs.github.com/en/code-security/secret-scanning) |
| Detection patterns | provider-specific prefixes (AKIA…, ghp_…, xox…) beat generic regex; entropy scoring catches the rest | [gitleaks config](https://github.com/gitleaks/gitleaks#configuration) |
| Scanning diffs vs whole trees | diff-scan blocks NEW leaks cheaply in PRs; full-history scans are periodic deep cleans | gitleaks docs |
| env hierarchies | .env.example committed / .env gitignored / runtime injection; one accidental `git add .` is the classic disaster | [12factor — config](https://12factor.net/config) |
| Rotation discipline | rotation = revocation + redeploy of dependents; practiced via drills, not wiki pages | [OWASP — secrets mgmt cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) |
| Dependency supply chain | lockfiles pin intent; audit gates on known CVEs; provenance/SBOM for the paranoid-but-soon-standard | [npm audit docs](https://docs.npmjs.com/cli/v10/commands/npm-audit) |

## Keep in mind

- **History rewrite without rotation = theater.** The credential is already harvested by bots within minutes.
- **Test keys are real keys** in staging accounts — scanners don't distinguish "fake" prefixes.
- **Mask findings in reports too**: your scanner output must not BECOME the leak (print prefix + ***).
- **False positives need an escape hatch** (`#[gitleaks:allow]` style annotations) or teams will disable the scanner entirely.
- Lockfile drift between package.json and lock = supply-chain review failure even with zero CVEs.

## Self-check quiz

<details><summary>1. Secret leaked 3 weeks ago, deleted last week in commit "remove key". Safe?</summary>
No — still reachable via old commits/forks/caches. Rotate/revoke NOW, then consider history rewrite; deletion ≠ revocation.</details>

<details><summary>2. Why does your scanner mask its own output?</summary>
Scanner results get pasted into PRs/dashboards/chats — unmasked values would replicate the leak into new systems. Prefix+*** proves presence safely.</details>

<details><summary>3. <code>npm audit</code> shows a critical CVE in a transitive dep with no fix. Options ranked?</summary>
(1) override/resolution to patched version if compatible; (2) replace dependency; (3) accept w/ documented risk + expiry. Never silent-accept.</details>

## Assignment

→ [assignment.md](assignment.md)
