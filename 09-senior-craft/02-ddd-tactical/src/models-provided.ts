// ── PROVIDED: a deliberately anemic/broken model to critique ─────────────
// Read alongside ../assignment.md — your boundaries.md analysis cites these.

export interface BrokenOrderRow {
  id: number;
  userId: number;
  currency: string;
  totalCents: number; // stored, never recomputed
  items: Array<{ sku: string; unitPriceCents: number; quantity: number }>;
}

export class BrokenOrder {
  constructor(public readonly row: BrokenOrderRow) {}

  // Anyone can mutate anything; totals drift silently.
  addItem(sku: string, unitPriceCents: number, quantity: number): void {
    this.row.items.push({ sku, unitPriceCents, quantity });
  }

  removeItem(index: number): void {
    this.row.items.splice(index, 1); // negative index? out of range? shrug
  }
}
