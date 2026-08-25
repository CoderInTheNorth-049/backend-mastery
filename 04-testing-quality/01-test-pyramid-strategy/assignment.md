# Assignment — Build a micro test-runner

## The problem you're solving
You've written hundreds of `describe/it` blocks, but could you BUILD one? Understanding the engine — registration phase vs execution phase, hook scoping, error isolation — is what separates “I use vitest” from “I can debug any test framework weirdness”. Today you build the skeleton every runner hides.

## Your tasks
Implement `runTests(register)` in [src/runner.ts](src/runner.ts):

1. **Registration phase** — run `register` ONCE synchronously. `describe` nests via a path stack; `it` records `{name, suite, fn}`; hooks attach to the CURRENT describe scope.
2. **Execution phase** — tests run sequentially in registration order; a failing test NEVER prevents later ones.
3. **Hooks** — a test's `beforeEach` chain runs root→leaf (outermost first); `afterEach` runs leaf→root. Ancestor hooks apply regardless of declaration position relative to nested describes.
4. **Async** — await test fns and hooks alike (rejected promise = failure with its message).
5. **Error isolation & reporting** — capture `error.message`; afterEach failures ALSO fail the test unless the body already failed (body's error wins); produce `{ results: TestResult[], total, passed, failed }`.

## Definition of done
- [ ] Spec green (`pnpm test:topic 04-testing-quality/01-test-pyramid-strategy`)
- [ ] Zero unhandled rejections during a full run
- [ ] No globals mutated outside your module

## Hints (open only when stuck)

<details><summary>Phase separation</summary>
Collect into a flat array of tests + a Map of hooks keyed by scope path (join with "\u0000"). After register() returns, iterate tests linearly — no recursion needed at execution time.</details>

<details><summary>Hook chains</summary>
For suite ["outer","inner"]: beforeEach = hooks of [], ["outer"], ["outer","inner"] concatenated in order; afterEach = same scopes REVERSED.</details>

## Going further (optional)
Add `it.skip` (reported as skipped, not counted), per-test `durationMs`, or `beforeAll/afterAll` per scope.
