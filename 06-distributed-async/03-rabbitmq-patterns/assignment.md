# Assignment — AMQP topic-exchange routing, in-process

## The problem you're solving
RabbitMQ's superpower is its routing grammar: patterns of words where `*` eats exactly one word and `#` eats zero-or-more. Teams bind `order.*.eu` and `#.payments` without understanding what they'll receive. You'll implement the matcher itself — after this, binding patterns read like regex you already know.

## Your tasks
Implement in [src/topic-match.ts](src/topic-match.ts):

1. **`matchesTopicBinding(routingKey, pattern)`** — split both on `.`, then match word-by-word: literal equality, `*` = exactly one word, `#` = zero or more (it CAN match nothing).
2. **`routeMessage(patterns[], routingKey)`** — return every matching pattern, preserving input order (fan-out-with-filtering).

## Definition of done
- [ ] Spec green incl. the gnarly combos: `a.b` vs `#.#` ✓ · `a` vs `*.#` ✓ · `b.c` vs `*.b.#` ✗ · `order.created.eu` vs `order.*` ✗ (exactly-two-words means what it says)

## Hints (open only when stuck)

<details><summary># semantics</summary>
Recursive two-pointer DP with memo: <code>matches(i,j+1)</code> (# eats nothing) OR <code>i&lt;len && matches(i+1,j)</code> (# eats one more).</details>

## Going further (optional)
Add header-exchange matching (all/any mode) and fanout short-circuit.