# Assignment — author a quality-gate workflow

## The problem you're solving
Your standards only protect the codebase if they run AUTOMATICALLY on every PR. You'll author a complete GitHub Actions workflow — lint job, test matrix across Node versions, pnpm caching, coverage artifact, concurrency cancellation — and a spec parses your YAML to verify the structure. Invalid YAML fails; missing gates fail.

## Your tasks
Create [submission/lint-and-test.yml](submission/lint-and-test.yml) implementing:

1. **Triggers**: `push` (branches `[main]`) AND `pull_request`.
2. **Concurrency**: group referencing <code v-pre>${{ github.workflow }}-${{ github.ref }}</code>, `cancel-in-progress: true`.
3. **`lint` job** (ubuntu-latest): checkout (`actions/checkout@v4`) → a run step executing `pnpm lint`.
4. **`test` job**:
   - matrix over Node `20` and `22`
   - steps: checkout@v4 → `pnpm/action-setup@v4` (version 10) → `actions/setup-node@v4` with the MATRIX node version and `cache: pnpm` → `pnpm install --frozen-lockfile` → `pnpm typecheck` → tests via vitest/coverage → upload `coverage/` with `actions/upload-artifact@v4` (artifact name contains "coverage")

## Definition of done
- [ ] Spec green — it PARSES your YAML (js-yaml) and asserts each requirement above
- [ ] Bonus: copy the file into `.github/workflows/` on a scratch branch and watch it actually run

## Hints (open only when stuck)

<details><summary>Matrix shape</summary>
jobs.test.strategy.matrix.node: [20, 22]; then node-version: <code v-pre>"${{ matrix.node }}"</code> inside setup-node. Quote expressions to be safe.
</details>

<details><summary>Bare keys</summary>
<code>pull_request:</code> with no value is valid but parses as null — write <code>pull_request: {}</code> for clarity.</details>

## Going further (optional)
Add a docs-check job failing when any topic folder lacks README.md; cache k6 binaries between runs; `paths-ignore` so docs-only PRs skip heavy jobs.
