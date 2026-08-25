# Topic: Express — the framework layer under everything

> **Goal:** Master middleware mechanics in their rawest form. NestJS is Express(+Fastify) with architecture bolted on; you need the substrate fluent first.

## Beginner-friendly picks

- 🎥 YouTube search: **“Express JS crash course”** — Traversy/freeCodeCamp one-shots pair well with the assignment
- 🧪 [Express examples repo](https://github.com/expressjs/express/tree/master/examples) — tiny official samples per feature

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Middleware pipeline | `(req,res,next)`, ordering = behavior, error-handling middleware signature (4 args!) | [Express guide — middleware](https://expressjs.com/en/guide/using-middleware.html) |
| Routing | `app.get` patterns, params (`:id`), query strings, routers as mountable units | [Express guide — routing](https://expressjs.com/en/guide/routing.html) |
| Body parsing | Why `express.json()` exists, body-size limits, malformed-JSON error surfacing | Express docs + [body-parser](https://expressjs.com/en/resources/middleware/body-parser.html) |
| Error propagation | Thrown vs `next(err)`; async handlers DO NOT auto-catch in plain Express v4 (v5 does!) — the classic footgun | [Express — error handling](https://expressjs.com/en/guide/error-handling.html) |
| Testing without ports | Export app factory → supertest binds nothing; why `app.listen()` stays in a separate entry file | [Supertest README](https://github.com/ladjs/supertest#readme) |
| Production checklist | helmet, trust proxy, graceful shutdown hooks (phase 07 revisits), request-id middleware | [Express security best practices](https://expressjs.com/en/advanced/best-practice-security.html) |

## Keep in mind

- **Order is semantics.** `express.json()` AFTER your route = `req.body` undefined. Error handler LAST or it never fires.
- **Express 4 vs 5**: this repo uses **Express 5** (async errors auto-forwarded, path-to-regexp v8). Know that older tutorials assume v4 quirks.
- **Never leak internals**: stack traces and driver errors go to logs; clients get codes + safe messages. Your spec enforces the shape.
- **Validation lives at the edge** (middleware), types live inside — Zod formalizes this in NestJS topic; here you hand-roll to feel why validators exist.
- 409 Conflict isn't just for ETags: duplicate email signup IS a conflict with current resource state.

## Self-check quiz

<details><summary>1. Why doesn't <code>app.get('/users', async (req,res,next) => { throw err })</code> reach the error handler in Express 4?</summary>
Promise rejections from sync-invoked async fns are swallowed by express's callback style — next() never called. Fix: wrap (try/catch→next), use express-async-errors shim, or upgrade to v5 which forwards rejected promises.</details>

<details><summary>2. What's the difference between <code>app.use(fn)</code> mounted at '/' vs <code>app.all('/x', fn)</code>?</summary>
use() runs for EVERY matching path prefix (and continues into routers); all() matches exact route /x across verbs but participates in routing flow. Mounting order still decides execution.</details>

<details><summary>3. Where should request-id generation live and why?</summary>
Earliest possible middleware: every downstream log line, error envelope, and upstream response header can correlate. Assigning late loses half the trail.</details>

<details><summary>4. supertest(request(app)) — what breaks if your entry file calls listen() at import time?</summary>
Tests import the app module → server binds during test collection → port conflicts + leaked handles. Separate app factory from bootstrap; listen only in bin/www-style entry.</details>

## Assignment

[assignment.md](assignment.md) — users API with validation, conflict handling, typed error envelope, and a full supertest suite. This becomes your reference skeleton for capstone #1.
