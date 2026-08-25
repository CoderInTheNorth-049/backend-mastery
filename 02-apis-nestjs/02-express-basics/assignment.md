# Assignment — a tested users API, production-shaped

## The problem you're solving
“Make a CRUD endpoint” is junior-hour. Senior-hour asks: what does a duplicate email RETURN? where do stack traces go? does a malformed body crash the pod? You'll build one small users API where every edge case has a deliberate, tested answer — the skeleton you'll clone for capstones.

## Your tasks
Build `createApp(): Express` in [src/app.ts](src/app.ts):
1. Endpoints: health check; create/list/get/delete users (201/200/204 paths included).
2. Validation on POST: trimmed non-empty name, regex-checked email — ALL violations collected into one structured 400 envelope, emails normalized to lowercase.
3. Duplicate emails → 409 CONFLICT. Unknown routes → JSON 404 envelope. Malformed JSON → 400 BAD_JSON envelope. Unexpected errors → 500 INTERNAL with zero internal details leaked.
4. Export an `HttpError` class and a central `errorHandler` middleware implementing those translations; `createApp(options?)` accepts `{attach}` so routers can mount BEFORE the 404/error tail (Express searches forward for error middleware — the spec exercises this!).
5. Each app instance keeps its OWN user store — two apps must not share state.

## Definition of done
- [ ] supertest suite green
- [ ] No stack trace ever reaches a response body
- [ ] Two apps coexist independently

## Hints

<details><summary>Malformed JSON detection</summary>
Register <code>express.json()</code> then an error handler that checks <code>err instanceof SyntaxError && 'body' in err</code> (or err.type==='entity.parse.failed') → BAD_JSON; else next(err).</details>

<details><summary>204 gotcha</summary>
res.status(204).end() — sending a body with 204 breaks clients. Supertest asserts exactly that.</details>

<details><summary>Duplicate email check</summary>
Normalize emails (trim+lowercase) before compare AND store — case-duplicates must conflict too.</details>

## Acceptance criteria

- [ ] Spec green
- [ ] No stack traces or driver messages reachable from any client-visible body
- [ ] Two apps don't share users

## Stretch

- Add `X-Request-Id` middleware (generate uuid if absent, echo back) — spec-ready for capstone
- Rate-limit POST /users to 5/min/IP using an in-memory token bucket (ties to phase 05 preview)
