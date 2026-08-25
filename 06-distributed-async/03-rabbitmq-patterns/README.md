# Topic: RabbitMQ patterns — exchanges, bindings & the routing matrix

> **Goal:** AMQP's real power is its ROUTING grammar. You'll implement the topic-exchange matcher (`*` = one word, `#` = zero-or-more) — the exact algorithm brokers run — as pure functions, so you understand bindings forever without needing a broker to grade you.

## Beginner-friendly picks

- 🧪 [RabbitMQ tutorials 3–5 are the topic-exchange story](https://www.rabbitmq.com/getstarted.html) — run their snippets locally if Docker exists

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Exchange types | direct (exact key), fanout (broadcast), topic (pattern words), headers — when each earns its complexity | [RabbitMQ tutorial 3-5](https://www.rabbitmq.com/getstarted.html) |
| Bindings & routing keys | messages publish TO exchanges with a key; queues bind WITH patterns; matching happens at exchange | same series |
| Topic word rules | `*` = exactly ONE word; `#` = ZERO or more; words split on `.`; keys like `order.created.eu` | [RabbitMQ — topic exchange](https://www.rabbitmq.com/tutorials/tutorial-five-javascript) |
| Delivery guarantees recap | publisher confirms + consumer acks + durability = your at-least-once kit | [RabbitMQ — reliability](https://www.rabbitmq.com/reliability.html) |
| Dead-letter exchanges | rejected/expired messages routed onward — the DLQ mechanism native to AMQP | [RabbitMQ — DLX](https://www.rabbitmq.com/dlx.html) |
| Quorum vs classic queues | replicated quorum queues for anything that must survive node loss | [RabbitMQ — quorum queues](https://www.rabbitmq.com/quorum.html) |

## Keep in mind

- **`#` alone matches everything** — including zero words. `*.*` needs EXACTLY two. Mixing them (`#.orders.#`) is legal and occasionally brilliant.
- **Routing is per-exchange**: the same message hits every queue whose bound pattern matches — fanout of filtered copies, free.
- **Unroutable messages vanish** (unless mandatory flag/alternate exchange configured). Silent drops are a production classic.
- **DLX chains need cycle guards**: a dead-lettered message re-failing into the same DLX loops forever.
- The matcher you build IS RabbitMQ's topic algorithm — after this, binding patterns read like regex you already know.

## Self-check quiz

<details><summary>1. Queue bound with <code>order.*</code> — which of these deliver: <code>order.created</code>, <code>order</code>, <code>order.created.eu</code>?</summary>
Only order.created. * = exactly one word; bare "order" has zero trailing words; three-word key overshoots.</details>

<details><summary>2. What does pattern <code>#</code> match, and how is it different from <code>#.#</code>?</summary>
Functionally identical — both match any key incl. single words (# can match zero). Redundant patterns waste matching cycles only.</details>

<details><summary>3. Producer wants ONE message to reach both an analytics queue and an audit queue with different patterns. Mechanism?</summary>
Publish once to a topic exchange; each queue binds its own pattern. Fan-out-with-filtering is the exchange's job — never publish twice.</details>

<details><summary>4. Message rejected (requeue=false) by the only consumer of a queue with a DLX bound. Path?</summary>
Routed to the dead-letter exchange using ITS bindings → whatever queue(s) they match. Original routing key carried along unless re-pointed.</details>

## Assignment

[assignment.md](assignment.md) — implement `matchesTopicBinding(routingKey, pattern)` plus a tiny `routeMessage(patterns[], key)` helper, graded against ~20 spec cases including the gnarly `#`/`*` combinations.
