# Phase 02 — APIs, NestJS internals & auth (~4 weeks)

From "I can call APIs" to "I can design, build, secure and document one."

## Beginner-friendly picks

- 🎥 [The Net Ninja — REST API / Node playlists](https://www.youtube.com/@NetNinja) — gentle series format
- 🎥 [Fireship](https://www.youtube.com/@Fireship) — 100-seconds overviews to orient before depth

## Topics

| Folder | Est. | You build |
|---|---|---|
| [01-rest-api-design](01-rest-api-design/) | 3 days | A written REST design doc (the skill interviews actually test) |
| [02-express-basics](02-express-basics/) | 4 days | Tested users-API with validation, errors, 409s — supertest-driven |
| [03-dependency-injection](03-dependency-injection/) | 4 days | A working DI container with decorators — NestJS demystified forever |
| [04-auth-jwt](04-auth-jwt/) | 5 days | HS256 JWT sign/verify **from raw crypto primitives**, incl. algorithm-confusion defense |

## Why this order

Express first so NestJS's magic (providers, guards, interceptors) lands as *familiar patterns formalized*, not incantations. The DI assignment is the bridge: after building your own injector, Nest modules read like documentation of things you already understand.

## Done means

- [ ] All coded topics green; design doc passes its own rubric
- [ ] You can explain: middleware pipeline order, DI resolution & circular guards, JWT attack surface
- [ ] Ready to start capstone #1 ([URL shortener](../capstones/01-url-shortener/project-brief.md))

## Preview: OpenAPI/docs

Documentation gets its deep pass during the capstone (@nestjs/swagger generates an OpenAPI spec served via Scalar UI). Topic 01's design doc plants the vocabulary you'll need.
