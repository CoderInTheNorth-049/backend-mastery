# Assignment — types that work as hard as your runtime code

## The problem you're solving
Every backend grows the same five utilities: pick fields off objects safely, compare deep structures, model “this OR that failed”, and broadcast typed events. Weak versions of these cause real bugs — wrong currency math, leaked payloads, listeners that never unsubscribe. Build them once, properly typed, and reuse the patterns forever.

## Your tasks
Implement in [src/utils.ts](src/utils.ts):
1. `pick(obj, keys)` / `omit(obj, keys)` — return NEW objects containing all-but/exactly the chosen keys.
2. `deepEqual(a, b)` — structural comparison: NaN equals NaN, arrays compare element-wise in order, objects need identical key SETS, Dates compare by time, `null ≠ {}`.
3. `Result<T,E>` + `ok()` / `err()` / `unwrapOr()` — success/failure as data so callers can't ignore errors.
4. `TypedEmitter<Events>` — an event bus where `emit("tick", "oops")` is a compile error and `on(...)` returns its own unsubscribe function.

## Definition of done
- [ ] Spec green via `pnpm test:topic 01-typescript-node/01-ts-type-system`
- [ ] Zero `any` in your implementations (`unknown` allowed)
- [ ] The commented-out invalid emit lines would fail typecheck if uncommented

## Hints

<details><summary>Hint 1 — deepEqual</summary>
Handle null/typeof-primitive fast path first via <code>Object.is</code>. Then branch: Date?, Array?, plain object?. For objects compare <code>Object.keys(a).length === Object.keys(b).length</code> then recurse per key with <code>b.hasOwnProperty(k)</code> check.
</details>

<details><summary>Hint 2 — emitter typing</summary>
Store listeners in <code>Map&lt;keyof Events, Set&lt;Function&gt;&gt;</code>-ish structure; casts live INSIDE the class (one file, contained <code>as</code>) while the public API stays fully typed. Containing casts in one place IS the professional pattern.
</details>

## Acceptance criteria

- [ ] Spec green
- [ ] Zero `any` in your implementation (`unknown` allowed)
- [ ] The commented-out invalid emit line in this assignment would fail `pnpm typecheck` if uncommented

## Stretch

- Implement `PartialBy<T, K extends keyof T>` (make only K optional)
- Add `once<K>(event, listener)` to the emitter
- Write a `assertNever(x: never): never` and wire an exhaustive-switch test
