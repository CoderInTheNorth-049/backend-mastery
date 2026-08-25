# Assignment — Delivery-semantics decision matrix

## The problem you're solving
“Just put it on a queue” hides the only question that matters at 3 AM: when messages get DUPLICATED or LOST, who notices and who pays? Six producer→consumer flows force you to choose semantics deliberately, name the mechanism, and admit the residual risk.

## Your tasks
Create `delivery-semantics.md` covering six flows. Per flow: **Semantics** (at-most/at-least/exactly-once framing) → **Mechanism** (ack modes, retries, dedupe keys) → **Tolerates** (which failures) → **Residual risk** (what STILL goes wrong):

1. Order-created → inventory reservation
2. Password-reset email send
3. Analytics click events (lossy acceptable)
4. Payment webhooks INBOUND to your platform
5. Cache invalidation broadcasts
6. Audit log entries → immutable storage

Then one paragraph: **where would exactly-once actually be achievable end-to-end in our stack, and what does it cost?**

## Definition of done
- [ ] Semantics match the blast radius of duplicates/loss per flow
- [ ] Mechanisms are concrete (inbox tables, idempotency keys, TTLs) not adjectives
- [ ] Residual risks admitted honestly
- [ ] Exactly-once paragraph names pipeline boundaries, not flags
- [ ] Self-scored ≥14/18 on the README rubric

## Going further (optional)
Redo the matrix assuming money flows through EVERY path — which rows change?