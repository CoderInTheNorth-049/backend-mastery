// ── AMQP topic-exchange routing, in-process ──────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

/**
 * RabbitMQ topic-exchange matching.
 *
 * Words split on "."; pattern words:
 *   "*"  → exactly one word
 *   "#"  → zero or more words
 *
 * matchesTopicBinding("order.created.eu", "order.*.eu") → true
 * matchesTopicBinding("order",           "order.*")     → false
 * matchesTopicBinding("anything.at.all", "#")           → true
 */
export function matchesTopicBinding(routingKey: string, pattern: string): boolean {
  throw new Error("TODO: implement matchesTopicBinding");
}

/** Which of the bound patterns match this routing key? (input order preserved) */
export function routeMessage(patterns: string[], routingKey: string): string[] {
  throw new Error("TODO: implement routeMessage");
}
