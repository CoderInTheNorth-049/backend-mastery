# Topic: TypeScript's type system as an engineering tool

> **Goal:** Move types from "syntax tax" to design instrument. Types that make invalid states unrepresentable eliminate entire bug classes before runtime.

## Beginner-friendly picks

- 🎥 [Matt Pocock (YouTube)](https://www.youtube.com/@mattpocockuk) — bite-size TS mental-model videos
- 📖 [Basarat — TypeScript Deep Dive](https://basarat.gitbook.io/typescript) — classic free book
- 🧪 [type-challenges](https://github.com/type-challenges/type-challenges) — start at *easy* after this assignment

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Structural typing | Why `{a:1}` is assignable to `{a:1,b?:number}` but not vice versa | [TS Handbook — Types as sets](https://www.typescriptlang.org/docs/handbook/type-compatibility.html) |
| Generics & constraints | `<T, K extends keyof T>` — reading it aloud; why `Pick` needs both params | [Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) |
| Utility types | Pick/Omit/Partial/Required/Record — then implement three of them yourself (assignment!) | [Handbook — Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types/) |
| Discriminated unions | The `kind`/`ok` tag pattern; exhaustiveness with `never`; why this kills `if (err) else` ambiguity | [Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) |
| Type narrowing at runtime | `typeof`/`in`/user-defined guards; how `unknown` beats `any` | [Total TypeScript — free tutorials](https://www.totaltypescript.com/tutorials) |
| Declaration merging & `declare` | How ambient types work (you'll meet them in Express/Nest typings) | [Handbook — Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) |

## Keep in mind

- **`any` is a lie detector failure.** `unknown` + narrowing gives the same flexibility with proof. Code review rule: every `any` needs a written justification.
- **Result/Either types replace thrown control flow** for expected failures (validation, not-found). Reserve exceptions for bugs. This repo's later phases standardize on `Result` in library-style code.
- **Types vanish at runtime.** Validation must exist too (Zod enters in phase 02) — types prove shape claims, they don't verify bytes arriving over the wire.
- **Exhaustive switches**: adding a variant should be a compile error until every consumer handles it. That's the whole senior trick behind safe refactors.
- `strict: true` is the floor, not the achievement. `noUncheckedIndexedAccess` etc. come later; understand what each flag buys before enabling blindly.

## Self-check quiz

<details><summary>1. Why does <code>Omit&lt;T,K&gt;</code> silently allow misspelled keys in some TS versions/patterns, and what's the fix?</summary>
Omit distributes over unions badly and accepts excess keys historically (K extends PropertyKey unconstrained in old defs). Fix: constrain — <code>Omit&lt;T, Extract&lt;K, keyof T&gt;&gt;</code> wrappers or strict-omit variants.
</details>

<details><summary>2. Model API outcomes: success {data}, failure {message, retryable}. Show the union.</summary>
<code>type Outcome = { ok: true; data: User } | { ok: false; message: string; retryable: boolean }</code>. Narrow via <code>outcome.ok</code>; switch exhaustiveness via assertNever on future variants.
</details>

<details><summary>3. When are two object types compatible despite different names?</summary>
Always structurally — no nominal typing in TS. Duck typing at compile time; only brand/tag patterns simulate nominal behavior.
</details>

<details><summary>4. What's dangerous about user-defined type guards (<code>x is Foo</code>)?</summary>
They're unchecked assertions — lie once, poison everything downstream. Keep guard logic trivially correct or derive it from validators.
</details>

## Assignment

[assignment.md](assignment.md) — implement `pick`/`omit`/`deepEqual`, a `Result` monad-lite, and a strongly-typed event emitter (the exact pattern NestJS's EventEmitter and Redis pub/sub wrappers use internally).
