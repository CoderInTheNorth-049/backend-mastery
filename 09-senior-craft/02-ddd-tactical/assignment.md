# Assignment — Spot the broken aggregate, then build it right

## The problem you're solving
[src/models-provided.ts](src/models-provided.ts) is how most teams write domain code: public fields, totals stored but never recomputed, remove-by-index that shrugs at bad input. Any future caller can silently break “order total = sum of line items”. You'll critique that model in writing, then build the corrected version — a `Money` value object and an `Order` aggregate where invalid states are UNREPRESENTABLE.

## Your tasks
1. **Written** — create `boundaries.md`: identify ≥4 flaws in `models-provided.ts` (name the pattern violated), propose correct aggregate boundaries (what's inside the Order aggregate? what's referenced by id?), and list which rules become enforced INVIARIANTS vs application checks.
2. **Coded** — implement in [src/order.ts](src/order.ts):
   - `Money.ofCents(cents, currency)` value object: non-negative INTEGER cents, exactly-3-letter uppercase currency; immutable; `add` (same-currency only, new instance); `multiplyBy` (positive integer); `equals` by value
   - `Order.create(currency)` → empty editable order; `addLineItem({sku, unitPrice, quantity})` enforcing invariants as DomainErrors: editable state, positive integer quantity, matching currency, ≤100 items
   - `place()` requires ≥1 item and freezes all further edits
   - `items` exposes read-only view incl. per-line totals; `total` always equals Σ lineTotals automatically

## Definition of done
- [ ] Spec green (`pnpm test:topic 09-senior-craft/02-ddd-tactical`)
- [ ] `boundaries.md` names the anemic-model smell explicitly
- [ ] Zero public setters on the aggregate

## Hints (open only when stuck)

<details><summary>Money immutability</summary>
Operations return NEW instances; never mutate <code>this.cents</code>. Alias-safety comes from immutability, not discipline.</details>

<details><summary>Currency guard</summary>
<code>/^[A-Z]{3}$/.test(currency)</code> — reject anything else in BOTH ofCents and Order.create.</details>

## Going further (optional)
Emit domain events from state transitions (OrderPlaced) into an outbox-shaped array — bridging straight back to phase 06.