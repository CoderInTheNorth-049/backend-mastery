# Assignment — design the Library API on paper first

## The problem you're solving
Before NestJS writes a single route, senior engineers decide: which resources exist, what happens when things conflict, how clients paginate reliably. Teams that skip this rebuild endpoints three times. Your deliverable is a DESIGN DOC — because interviews test exactly this judgment.

## Your tasks
Create `design.md` in this folder covering a small library system (members browse books, borrow copies, reserve unavailable ones):
1. Conventions section: versioning choice (defend it!), auth scheme, error format based on RFC 9457.
2. Endpoint table: method, path, purpose, success status, notable failure statuses — including checkout WITH idempotency keys, returns, and reservations.
3. Status-code matrix for six tricky scenarios (must include one 409 and one 422, plus your 401-vs-403 policy).
4. Cursor-pagination spec: what's INSIDE the opaque cursor, limits, sort whitelist rationale.
5. Idempotency spec: key header, storage duration, replay behavior under concurrent duplicates.
6. OpenAPI YAML skeleton for TWO endpoints (paste-ready for editor.swagger.io).

## Definition of done
- [ ] Self-scored ≥18/24 on the rubric below
- [ ] A stranger could implement your API without messaging you

## Hints if stuck

<details><summary>Return-a-book struggle?</summary>
Loans are resources: POST /loans creates; returning changes loan state — PATCH /loans/{id} {returnedAt} or POST /loans/{id}/return (action sub-resource)? Defend either; the defense is the point.
</details>

<details><summary>Cursor contents?</summary>
Base64 of JSON {lastCreatedAt, lastId} — tiebreaker id makes sort stable under duplicates. Never expose raw DB offsets.</details>

<details><summary>Concurrent idempotent retries?</summary>
Two same-key requests racing: store with unique constraint on (route,key); loser gets 409 Conflict + Location to winner's result. Stripe's docs describe exactly this dance.</details>
