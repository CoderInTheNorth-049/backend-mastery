# Topic: REST API design — contracts humans and machines can live with

> **Goal:** Make resource/modeling decisions defensibly. This is a *writing* topic: your deliverable is a design doc, because senior engineers are paid for documented judgment.

## Beginner-friendly picks

- 📝 [Microsoft — API design best practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design) — pragmatic, free, excellent
- 📝 [Stripe API reference](https://docs.stripe.com/api) — read as an EXEMPLAR of API design, not just payments docs

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Resource modeling | Nouns not verbs; URI hierarchy without chatty paths; sub-resources vs query params | [MDN — HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) · [REST tutorial (free)](https://restfulapi.net/) |
| Method semantics | Idempotency per method; safe methods; why PATCH is special (RFC 5789) | RFC reading habit starts here |
| Status code discipline | 201 + Location, 204, 400 vs 422, 401 vs 403, 409 for conflicts, 429 + Retry-After | MDN status reference |
| Errors as data | Problem Details (RFC 9457 — successor of 7807); machine-readable codes + human messages | [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) |
| Pagination & filtering | Offset vs cursor pagination (and WHY cursors win at scale); sparse fieldsets; sort syntax | [JSON:API — pagination](https://jsonapi.org/format/#fetching-pagination) |
| Versioning | URL vs header vs media-type; when breaking changes justify v2 | [Stripe API blog principles](https://stripe.com/blog/api-versioning) (blog post free) |
| Idempotency keys | Safe retries for POST payments/orders; server-side key storage semantics | Stripe idempotency docs (free) |
| OpenAPI basics | Spec-first vs code-first; how docs/servers/clients generate from one truth | [OpenAPI spec](https://spec.openapis.org/oas/latest.html) · [Swagger Petstore](https://petstore.swagger.io/) |

## Keep in mind

- **Your API is a product with UI=URIs.** Inconsistent naming is tech debt users pay daily. Write conventions down BEFORE endpoint #10 exists.
- **422 vs 400**: syntactically broken → 400; semantically invalid → 422. Pick once, enforce everywhere (middleware makes it mechanical).
- **Cursor pagination** encodes position opaquely (base64 of sort key); offset breaks under inserts AND degrades at page 10⁵. Interviewers probe exactly here.
- **Breaking changes have a cost curve.** additive-optional ≈ free; renames/removals need versioning/deprecation windows (Sunset headers).
- **Design doc ≠ bureaucracy.** One page forcing you to decide auth, errors, pagination, versioning BEFORE coding catches 80% of rework. Template below.

## Self-check quiz

<details><summary>1. Client needs "orders filtered by status=paid, newest first, page 2". Sketch URI + response envelope.</summary>
GET /orders?status=paid&sort=-created_at&cursor=<opaque>&limit=50 → {data:[...], nextCursor:"..."|null}. Cursor from prior response; never client-computed offsets.
</details>

<details><summary>2. Where does the idempotency key live, what does server do on replay, TTL?</summary>
Header Idempotency-Key (UUID from client). Server stores key→response (status+body) scoped to route+key for e.g. 24h; replays stored response identically; concurrent duplicates get 409-or-hold-until-first-settles (implementation choice — defend yours).</details>

<details><summary>3. Your public field <code>userName</code> must become <code>username</code>. Migration plan?</summary>
Add new field, dual-write, document deprecation (docs + Sunset/Deprecation headers), monitor old-field usage, remove only after window expires. Never rename in place.</details>

<details><summary>4. Why is returning <code>{success:false}</code> with HTTP 200 harmful?</summary>
Caches/monitors/generic clients see success; retries & circuit breakers misfire; contract split across two channels. Status codes exist precisely for transport-level semantics.</details>

## Assignment — write the Library API design doc

[assignment.md](assignment.md) · **Deliverable:** `design.md` in this folder · **Grading:** self-scored rubric inside the assignment

You'll specify a small library system's public API end-to-end: resources, endpoints, statuses, errors (RFC 9457), pagination, versioning, idempotency, and an OpenAPI skeleton. No framework yet — decisions first, code later (capstone #1 consumes these exact skills).
