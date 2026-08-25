# Tooling guide — how this repo grades you

## The assignment contract

```
topic/
├── src/*.ts          ← you implement these (stubs throw)
├── <topic>.spec.ts   ← acceptance criteria; DO NOT EDIT (edits = cheating yourself)
├── solution/*.ts     ← reference implementation, same public API
└── assignment.md     ← task description, hints, stretch goals
```

Specs import only the public API described in `assignment.md`. Any implementation passing them is correct — yours may even beat the reference.

## Test runner: Vitest

Why Vitest over Jest: native TypeScript/ESM (zero transpile config), Vite-speed watch mode, compatible API (`describe/it/expect/vi`). Industry has largely converged on it for new Node projects.

Everyday flow:

```bash
pnpm test:topic 00-foundations/02-http-protocol    # fast loop
pnpm test:watch                                    # reruns on save
```

Reading a failure top-down: which `describe` → which `it` → expected vs received. Fix one red assertion at a time.

## Answer-key mode (how solutions are verified)

`SOLUTION_MODE=1` activates a tiny vite plugin ([vitest.config.ts](../vitest.config.ts)) that rewrites each spec's `./src/...` imports to `./solution/...`. So:

```bash
pnpm test:solutions   # all specs must pass against the answer keys
```

CI runs this on every push. Meaning: **the answer key can never silently rot** — whatever you see in `solution/` provably satisfies the exact tests you're graded by.

## Coverage

```bash
pnpm coverage         # terminal table + HTML at coverage/index.html
```

Provider is V8's built-in collector (no instrumentation build step). Threshold gates are intentionally **commented out** early on — enabling hard gates before phase 04 just creates noise. When you reach phase 04 you'll uncomment and tune them yourself as part of the CI lesson.

What good coverage means here: every branch of your retry/backoff logic, both sides of validation guards, error paths — not just the happy path the first test hits.

## Mocking HTTP: MSW (Mock Service Worker)

Phase 00's retry assignment and later integration tests use [MSW](https://mswjs.io) to intercept `fetch` at the network layer — no real sockets, deterministic responses, and it also catches *unhandled* requests (`onUnhandledRequest: 'error'`), which surfaces accidental real calls during tests.

Pattern used in this repo:

```ts
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## HTTP-level API tests: Supertest

From phase 02 you'll test Express apps **without binding ports**: export an app factory, pass it to `request(app)`. Fastify's equivalent (`app.inject()`) is covered in reading material — know both exist.

## What lands later (preview)

| Phase | Tooling added |
|---|---|
| 03 | Real PostgreSQL/Redis in tests via a three-tier harness: your own services (`TEST_*_URL`) → Docker/Testcontainers → zero-setup embedded binaries. Prisma 7 driver adapters, `prisma db push` per session |
| 04 | Coverage thresholds enforced, ESLint + prettier in CI, Pact-style contract testing concepts, k6 load scripts |
| 06 | Kafka in docker-compose for local dev + integration tests |
| 07 | LocalStack container, Terraform validate/fmt in CI |
| 08 | pino log assertions, OpenTelemetry test exporter |
| 10 | Ollama for local-model integration tests (no paid APIs needed) |

Each addition ships as part of that phase's assignments — you never configure tooling blind.
