# Topic: Dependency injection — build NestJS's core yourself

> **Goal:** Demolish the "magic" around NestJS/Spring DI. After implementing a decorator-based container with circular-dependency detection, framework docs read like descriptions of your own code.

## Beginner-friendly picks

- 🎥 YouTube search: **“dependency injection explained”** — concept-first videos before the Fowler article
- 📝 [NestJS — Providers docs](https://docs.nestjs.com/providers) — read AFTER your container works; everything will look familiar

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| What problem DI solves | Hard-coded `new` = untestable, tightly coupled; inversion = composition at the edges | [Martin Fowler — IoC containers & DI](https://martinfowler.com/articles/injection.html) (canonical, free) |
| Decorators in TS | Class/property/param decorators; what they can and cannot change | [TS Handbook — Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html) |
| Metadata via reflect-metadata | `design:paramtypes` — where constructor types come from at runtime (emitDecoratorMetadata!) | [reflect-metadata polyfill README](https://github.com/rbuckton/reflect-metadata) |
| Container mechanics | Registration → resolution graph → instantiation strategies (singleton/transient), lifecycle hooks | NestJS providers docs as reference reading |
| Circular dependencies | Why A→B→A is unconstructable eagerly; frameworks' forwardRef workaround vs detection | [NestJS — circular deps](https://docs.nestjs.com/fundamentals/circular-dependency) |
| Tokens & interfaces | Classes carry runtime identity; interfaces don't survive compilation → tokens/abstract classes | NestJS injection tokens docs |

## Keep in mind

- **DI ≠ service locator.** Resolving from inside business logic re-couples you; injection happens at construction, once.
- **Singletons are shared mutable state.** Request-scoped data in a singleton = cross-user data leaks. Nest's scope modes exist precisely because of this.
- **Circular deps are a design smell wearing a technical mask.** Detection (your assignment) beats forwardRef band-aids; if two services need each other, extract a third.
- **Testing payoff**: with DI, unit tests inject fakes in one line. Your phase-02 Express app was hand-wired; feel the difference.
- `experimentalDecorators` + `emitDecoratorMetadata` are the tsconfig switches powering ALL of this (already on in this repo).

## Self-check quiz

<details><summary>1. Why do interfaces fail as injection tokens?</summary>
Types erase at runtime — no value exists for reflect-metadata to record. Use classes/abstract classes or string/symbol tokens carrying a mapping.</details>

<details><summary>2. Where does <code>design:paramtypes</code> come from and when is it absent?</summary>
Emitted by emitDecoratorMetadata ONLY when a decorator touches the class; plain classes have nothing. Also lost across package boundaries compiled without it.</details>

<details><summary>3. Your container resolves A→B→A. Options, ranked?</summary>
(1) Redesign/extract shared logic — best; (2) lazy/proxy injection (provider factory); (3) forwardRef-style placeholder resolved post-construction. Detection-first: fail loudly at resolve time like yours does.</details>

<details><summary>4. How would you add request-scoped instances to your container?</summary>
Child container per request inheriting parent singletons; cache lives in child for scoped tokens. Nest does exactly this hierarchy for REQUEST scope.</details>

## Assignment

[assignment.md](assignment.md) — implement `@Injectable()`, metadata-driven constructor injection, singleton caching, and circular detection. The spec wires Logger→Repo→Service chains exactly like a mini-Nest bootstrap.
