# Capstone 3 — Realtime Chat & Notification Service (reference solution)

Answer-key implementation of the realtime capstone: a Socket.IO chat hub with
HMAC-token handshake auth, TTL presence with zombie sweeping, keyset-paginated
durable history, and an explicit per-connection backpressure queue. Runs its
whole test suite green offline (in-memory store); a real Postgres adapter
sits behind `DATABASE_URL`.

## What this is

- Standalone NestJS 11 app (CommonJS, strict TS): REST for identity + history, Socket.IO for the live firehose.
- Ports & adapters throughout: pure domain units (`src/domain/`) carry the logic; Nest is delivery plumbing; storage swaps via env.
- Zero external services needed to develop or test. Set `DATABASE_URL` and the same binary persists to Postgres.

## Quickstart

```bash
pnpm install
pnpm test            # full suite green offline
pnpm build && pnpm start   # listens on :3003

# optional: pg mode (first init applies db/migrations automatically)
docker compose up -d db
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chat pnpm start
```

Never point production at the default `TOKEN_SECRET=dev-secret` — anyone
holding it can mint tokens for any user.

## Milestone map

| Milestone | Where it lives | Proof |
|---|---|---|
| M1 gateway & auth | `src/chat/chat.gateway.ts`, `src/auth/*`, `src/domain/hmac-token.ts` | `gateway.e2e.spec.ts` (invalid token → `UNAUTHORIZED` + disconnect), `hmac-token.spec.ts` |
| M2 durable message flow | `src/ports/message-store.ts`, `src/adapters/*` | `rest.e2e.spec.ts` (pagination), `messages.pg.int.ts` (pg adapter) |
| M3 fan-out & presence | `src/domain/presence.ts`, `src/chat/presence.service.ts`, sweeper in gateway | `presence.spec.ts`, presence broadcast assertions in `gateway.e2e.spec.ts` |
| M4 backpressure | `src/domain/outbound-queue.ts`, `src/chat/rate-limiter.service.ts` | `outbound-queue.spec.ts` (drop-oldest + count), rate-limit test in `gateway.e2e.spec.ts` |

## Architecture

```mermaid
flowchart LR
    A[Client Alice] <-->|socket.io| GW
    B[Client Bob] <-->|socket.io| GW
    subgraph Gateway [ChatGateway]
        AUTH[token verify on handshake]
        JOIN[join / rooms]
        RL[per-user TokenBucket]
    end
    GW --> OQ[OutboundQueue per connection<br/>cap 100 · drop-oldest · droppedCount]
    GW --> PS[PresenceService<br/>TTL registry + unref'd sweeper]
    GW --> ST[MessageStore port]
    ST --> MEM[(In-memory store)]
    ST --> PG[(Postgres messages)]
    HC[HistoryController<br/>GET /rooms/:id/messages] --> ST
    AC[AuthController<br/>POST /auth/token] --> TOK[HMAC signer]

    style OQ fill:#ffe9c7
    style RL fill:#ffe9c7
```

Message lifecycle (durability before fan-out):

```mermaid
sequenceDiagram
    participant A as Alice (WS)
    participant G as Gateway
    participant S as MessageStore
    participant B as Bob (WS)
    A->>G: message {roomId, text}
    G->>G: trim + validate → VALIDATION?
    G->>G: TokenBucket.take() → RATE_LIMITED?
    G->>S: append(msg)
    S-->>G: persisted (durability signal)
    G->>B: message {id, roomId, userId, text, ts}
    G-->>A: ack {ok, id}
```

## Decisions

| Decision | Why |
|---|---|
| HMAC token instead of a JWT library | Same wire shape and failure modes (tamper/expiry) with zero deps; swapping to real JWT touches only `TokenService`. |
| In-memory store default, pg behind env | Tests stay offline and instant; the adapter boundary is exercised by both implementations. |
| Keyset pagination `(ts,id) < cursor`, never OFFSET | New messages landing mid-scroll don't duplicate or skip rows across pages. |
| Persist → then broadcast | Append resolving is the durability confirm; no peer ever sees an un-persisted message. The write-behind queue would slot behind the same port. |
| Own room registry + per-socket OutboundQueue | `io.to(room).emit()` bypasses any backpressure seam; routing through the queue makes drop policy explicit and testable. Drop-OLDEST because stale chat is worthless and clients resync from the history cursor. |
| Presence = heartbeat TTL + sweep, keyed by userId | Multi-tab safe (last tab out flips presence), zombie sockets reaped even if TCP death goes unnoticed; `online()` self-filters so a stalled sweeper can't lie. |
| Per-user bucket survives reconnects | Otherwise cycling your socket resets your budget. Validation failures cost no tokens; over-limit sends are dropped without refund. |

## API & events tour

REST:

```bash
curl -s localhost:3003/auth/token -H 'content-type: application/json' -d '{"userId":"alice"}'
# {"token":"eyJ...base64url(json)...sig"}

curl -s "localhost:3003/rooms/dev/messages?limit=5"
# {"messages":[{id,roomId,userId,text,ts}...],"nextCursor":"b64..."}

curl -s localhost:3003/readyz      # {"status":"ready","store":"memory"}
curl -si localhost:3003/rooms/dev/messages?limit=nope   # 400 problem+json
```

Socket.IO (node script):

```js
import { io } from "socket.io-client";

const token = (await (await fetch("http://localhost:3003/auth/token", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ userId: "alice" }),
})).json()).token;

const socket = io("http://localhost:3003", { auth: { token } });
socket.on("connect", () => socket.emit("join", { roomId: "dev" }, (ack) => console.log("joined", ack)));
socket.on("message", (m) => console.log("message:", m));
socket.on("presence", (p) => console.log("online:", p.online));
socket.on("error", (e) => console.log("server said no:", e.code)); // UNAUTHORIZED | VALIDATION | RATE_LIMITED

socket.emit("message", { roomId: "dev", text: "hello" }, (ack) => console.log("acked:", ack));
setInterval(() => socket.emit("ping"), 15000); // heartbeat keeps presence fresh
```

Events: client→server `join{roomId}`, `message{roomId,text}`, `ping`;
server→client `message{id,roomId,userId,text,ts}`, `presence{online:[...]}`,
`error{code,message?}`.

## Resume bullet

Realtime chat hub (NestJS/Socket.IO/pg): HMAC-handshake auth, write-durable
fan-out, TTL presence with zombie sweeps, and per-connection bounded queues
(cap 100, drop-oldest, drop-count surfaced) that cap slow-client memory at
O(100 frames); keyset-paginated history replay; burst-then-refill rate
limiting verified e2e.
