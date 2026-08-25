# Topic: API paradigms — REST, GraphQL, gRPC, webhooks, SSE/WebSocket

> **Goal:** Pick protocols per PROBLEM, not per hype-cycle. The output is a decision matrix you'll reuse verbatim in design interviews.

## Beginner-friendly picks

- 🎥 ByteByteGo — REST vs GraphQL vs gRPC comparison shorts
- 📝 [GraphQL — best practices](https://graphql.org/learn/best-practices/) already linked; pair with its **thinking in graphs** page

## Core concepts

| Paradigm | Sweet spot | Costs you accept | Free reference |
|---|---|---|---|
| REST/JSON | public APIs, CRUD-ish resources, cacheability (HTTP semantics free) | over/under-fetch on complex views; N+1 client stitching; versioning discipline | [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) |
| GraphQL | many varied clients composing views (mobile + web dashboards); one round-trip for graphs | resolver N+1 server-side, caching harder (no free HTTP URLs), query-cost abuse surface | [GraphQL docs — best practices](https://graphql.org/learn/best-practices/) |
| gRPC | internal service-to-service, streaming (HTTP/2 duplex), polyglot contracts via proto | browser friction (needs grpc-web), human-unfriendly payloads, proto lifecycle mgmt | [gRPC docs](https://grpc.io/docs/what-is-grpc/introduction/) |
| Webhooks | server→server event push (you BUILT the delivery platform brief!) | retries/idempotency/signing are YOUR problem; endpoint discovery & rotation | phase 04 + flagship #1 brief |
| SSE | one-way server push over plain HTTP; auto-reconnect built-in | unidirectional; text-only events; 6-connection limit legacy on old HTTP/1.1 browsers | [MDN — SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) |
| WebSocket | bidirectional low-latency sessions (chat, games, collab) | stateful connections: LB affinity, reconnect/replay logic, backpressure is manual | [MDN — WS](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) |

## Keep in mind

- **REST's superpower is the URL as cache key.** If your "REST" API is all POST /rpc endpoints, you've kept the costs and dropped the benefit.
- **GraphQL moves N+1 from client to server** — dataloaders/batching are mandatory hygiene, not optional polish.
- **gRPC between YOUR services + REST at the edge** is the boring, correct default for most product companies.
- **Webhooks demand the reliability stack** you learned in phases 03–06: idempotency keys, exponential backoff, DLQs, HMAC signing.
- **SSE before WebSocket whenever the flow is one-way** — you keep HTTP semantics, proxies, and free reconnects.

## Self-check quiz

<details><summary>1. Mobile team complains REST forces 4 calls per screen. Two fixes, ranked by effort?</summary>
(1) Backend-for-Frontend / view endpoints aggregating those four; (2) adopt GraphQL with per-screen queries. BFF ships in days; GraphQL is a platform commitment.</details>

<details><summary>2. Why does HTTP caching mostly die under GraphQL?</summary>
One endpoint, POST bodies, query-shaped payloads ⇒ no stable per-resource URL/key. You reinvent caching via APQ, response IDs, or edge rules — per field.</details>

<details><summary>3. Internal service A streams telemetry to B continuously. REST polling vs gRPC streaming vs WS — pick and defend.</summary>
gRPC server-streaming: internal (no browser friction), typed contract, multiplexed on HTTP/2, native backpressure signals. WS adds connection-state burden without needing bidirectionality.</details>

<details><summary>4. Your webhook consumers keep processing duplicates. Whose bug?</summary>
Yours-as-provider if deliveries lack idempotency affordances (event ids, signing, documented at-least-once semantics); theirs-if they ignore your documented eventId. Contracts must SAY at-least-once.</details>

## Assignment — written deliverable `paradigms.md`

Fill the matrix: six scenarios × chosen paradigm + defense (≤3 sentences each) + "what would flip my choice" line (/18):

1. Public third-party developer API for your payments platform
2. Admin dashboard rendering 30 heterogeneous widgets per page
3. Inter-service order-event broadcast to 5 internal services
4. Live collaborative cursors in a document editor
5. Notification badges pushed to browsers
6. Partner systems that must receive order events reliably behind their own firewalls

### Rubric

| Criterion | Points |
|---|---|
| Each pick matches the paradigm's sweet spot table above | /6 |
| Each defense names ONE cost accepted + how it's mitigated | /6 |
| Flip-lines show real trigger conditions, not hand-waving | /4 |
| At least two answers pair paradigms (e.g., gRPC inside + webhooks out) deliberately | /2 |
