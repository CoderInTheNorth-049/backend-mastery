# Assignment — Transactional outbox + idempotent inbox

## The problem you're solving
“Save the order, then publish the event.” Crash between those two lines and downstream systems never learn the order existed — the dual-write bug that silently corrupts every event-driven system built without an outbox. You'll fix it properly on real PostgreSQL: events committed WITH state, a SKIP LOCKED relay claiming work safely under concurrency, and consumers that shrug off duplicates.

## Your tasks
Implement in [src/outbox.ts](src/outbox.ts) (specs wire a real pg Pool):

1. **`placeOrderWithOutbox(pool, input, bus)`** — ONE transaction inserts the order (`status='placed'`) AND its outbox row (`type='order.placed'`). AFTER commit, attempt an inline relay via `bus`: a THROWING bus must NOT roll anything back — published_at stays NULL for the real relay.
2. **`relayOnce(pool, bus, batchSize = 10)`** — claim unpublished rows `FOR UPDATE SKIP LOCKED`, publish each through the bus, mark `published_at`, return the count. Three concurrent relays must never double-publish.
3. **`consumeIdempotent(pool, event, handler)`** — claim `event.id` in the inbox (`ON CONFLICT DO NOTHING RETURNING`): fresh claim → run handler → `"processed"`; already claimed → `"duplicate"` WITHOUT re-running; handler throws → RELEASE the claim and rethrow so redelivery can retry.

## Definition of done
- [ ] Spec green including the money test: publisher crashes mid-flow → order committed, event pending, later relay delivers exactly once
- [ ] Concurrent-relay test shows zero duplicate publishes
- [ ] Replay-after-success reports `"duplicate"` without invoking the handler twice

## Hints (open only when stuck)

<details><summary>Claim release</summary>
Wrap claim+handler in one tx; on handler error ROLLBACK (claim gone) then DELETE is redundant — rollback already removed it. Choose ONE mechanism deliberately.</details>

## Going further (optional)
CDC-style relay via logical decoding notes; per-aggregate ordering guarantees sketch.