---
layout: home

hero:
  name: Backend Mastery
  text: From frontend developer to senior backend engineer
  tagline: A hands-on TypeScript + Node curriculum with assignments, automatic tests, capstones, and flagship projects.
  actions:
    - theme: brand
      text: Start with Phase 00
      link: /00-foundations/
    - theme: alt
      text: Read the roadmap
      link: /ROADMAP
    - theme: alt
      text: Full README
      link: /README

features:
  - icon: 🧱
    title: Phase 00 — Foundations
    details: HTTP, TCP/UDP, DNS, TLS, the Linux terminal, and Git.
    link: /00-foundations/
    linkText: Start phase 00
  - icon: 🟦
    title: Phase 01 — TypeScript & Node.js internals
    details: The type system, event loop, async patterns, streams, and concurrency control.
    link: /01-typescript-node/
    linkText: Start phase 01
  - icon: 🌐
    title: Phase 02 — APIs, NestJS internals & auth
    details: REST design, Express, dependency injection, and JWT auth from primitives.
    link: /02-apis-nestjs/
    linkText: Start phase 02
  - icon: 🗄️
    title: Phase 03 — Databases
    details: SQL, PostgreSQL + Prisma, indexes, transactions, concurrency, and Redis.
    link: /03-databases/
    linkText: Start phase 03
  - icon: 🧪
    title: Phase 04 — Testing & quality engineering
    details: The test pyramid, Testcontainers, mocks and contracts, k6, and CI quality gates.
    link: /04-testing-quality/
    linkText: Start phase 04
  - icon: 📐
    title: Phase 05 — System design
    details: Scaling primitives, caching, database scaling, CAP/PACELC, and classic interview designs.
    link: /05-system-design/
    linkText: Start phase 05
  - icon: 🔀
    title: Phase 06 — Distributed systems & async
    details: BullMQ, RabbitMQ, Kafka, the transactional outbox, sagas, and CQRS.
    link: /06-distributed-async/
    linkText: Start phase 06
  - icon: ☁️
    title: Phase 07 — Cloud & infrastructure
    details: Docker, Kubernetes, AWS via LocalStack, Terraform, and zero-downtime deploys.
    link: /07-cloud-infra/
    linkText: Start phase 07
  - icon: 🔭
    title: Phase 08 — Observability & security
    details: Structured logging, metrics, tracing, SLOs, OWASP, and secrets management.
    link: /08-observability-security/
    linkText: Start phase 08
  - icon: 🧠
    title: Phase 09 — Senior craft
    details: Design docs and RFCs, DDD, code review, postmortems, and interviewing.
    link: /09-senior-craft/
    linkText: Start phase 09
  - icon: 🤖
    title: Phase 10 — AI-native backends
    details: LLM streaming, embeddings, RAG, tool calling, and cost/rate guardrails.
    link: /10-ai-backend/
    linkText: Start phase 10
  - icon: 🏗️
    title: Capstones
    details: Four guided builds — URL shortener, movie booking, realtime chat, and e-commerce microservices.
    link: /capstones/01-url-shortener/project-brief
    linkText: Browse capstones
  - icon: 🚀
    title: Flagships
    details: Two long-running projects — a webhook delivery platform and an event-driven order system.
    link: /flagships/webhook-delivery-platform/project-brief
    linkText: Browse flagships
  - icon: 📚
    title: Guides
    details: Setup, tooling, career advice, the resource policy, and the assignment template.
    link: /docs/setup-guide
    linkText: Read the guides
---

## How to use this site

1. **Pick a phase** from the cards above or the **Curriculum** menu.
2. Each topic has a **Concepts** page and, when applicable, an **Assignment** page in the sidebar.
3. Read the concepts, open the assignment, then run the topic tests from the repo root.
4. Use **Previous / Next** at the bottom of each page to move through the curriculum in order.
5. Use the search box (or `Ctrl/Cmd + K`) to jump to any concept, assignment, capstone, or guide.

```bash
pnpm install
pnpm test:topic 00-foundations/02-http-protocol
```

> Answer keys under `solution/` folders are intentionally hidden from this website.
