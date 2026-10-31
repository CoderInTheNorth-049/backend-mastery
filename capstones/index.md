# Capstones

Four guided builds that combine the curriculum into interview-ready projects. Each capstone has a **project brief** (scope and requirements) and a **build guide** (milestone-by-milestone implementation). Reference implementations live under `solution/` in the repo and are intentionally hidden from this website.

| Capstone                                                                 | Best after  | Focus                                                                                       |
| ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------- |
| [1 — URL shortener](01-url-shortener/project-brief)                      | Phase 02    | NestJS API, Postgres persistence, collision-safe short codes, SSRF-safe validation, OpenAPI |
| [2 — Movie booking](02-movie-booking/project-brief)                      | Phase 03    | Seat locking, concurrency integrity, idempotent bookings, flaky payment simulation          |
| [3 — Realtime chat](03-realtime-chat/project-brief)                      | Phase 06    | WebSockets, presence, unread counts, write-behind persistence, queues                       |
| [4 — E-commerce microservices](04-ecommerce-microservices/project-brief) | Phase 06–07 | Service decomposition, Kafka, sagas, outbox, idempotent payments, LocalStack                |

## Suggested order

1. Start with [Capstone 1](01-url-shortener/project-brief) after Phase 02.
2. Move to [Capstone 2](02-movie-booking/project-brief) after Phase 03 for the concurrency work.
3. Do [Capstone 3](03-realtime-chat/project-brief) after Phase 06.
4. Finish with [Capstone 4](04-ecommerce-microservices/project-brief) once phases 06–07 are done.

Attempt each milestone yourself before reading the answer key. The build guides tell you when to consult the reference implementation.
