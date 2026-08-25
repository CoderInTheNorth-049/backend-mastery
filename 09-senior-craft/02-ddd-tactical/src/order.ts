// ── Your aggregate: Money value object + Order with enforced invariants ──
// Implement per ../assignment.md. Do NOT rename exports.

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Immutable value object: amount in minor units (cents) + ISO currency. */
export class Money {
  private constructor(
    public readonly cents: number,
    public readonly currency: string,
  ) {}

  static ofCents(cents: number, currency: string): Money {
    throw new Error("TODO: validate integer cents >= 0 and 3-letter currency");
  }

  add(other: Money): Money {
    throw new Error("TODO: same-currency add, returning NEW instance");
  }

  multiplyBy(qty: number): Money {
    throw new Error("TODO: positive-integer quantity multiply");
  }

  equals(other: Money): boolean {
    throw new Error("TODO: value equality");
  }
}

export interface LineItemInput {
  sku: string;
  unitPrice: Money;
  quantity: number;
}

export class Order {
  /** Read-only view of line items. */
  get items(): ReadonlyArray<{ sku: string; unitPrice: Money; quantity: number; lineTotal: Money }> {
    throw new Error("TODO: expose internal items safely");
  }

  get total(): Money {
    throw new Error("TODO: Σ lineTotals; zero-money when empty");
  }

  static create(currency: string): Order {
    throw new Error("TODO: validate currency, start empty");
  }

  /**
   * Invariants to enforce (throw DomainError):
   *   - order not already placed/cancelled
   *   - quantity positive integer
   *   - item currency matches order currency
   *   - max 100 items per order
   */
  addLineItem(input: LineItemInput): void {
    throw new Error("TODO: enforce invariants then append");
  }

  place(): void {
    throw new Error("TODO: only from editable state; ≥1 item required");
  }
}
