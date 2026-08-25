// Self-contained answer key: DomainError declared locally (no self-import
// through the answer-key redirector).
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
    if (!Number.isInteger(cents) || cents < 0) {
      throw new DomainError("money.invalid-amount", `cents must be a non-negative integer, got ${cents}`);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainError("money.invalid-currency", `currency must be 3 uppercase letters, got ${currency}`);
    }
    return new Money(cents, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  multiplyBy(quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainError("money.invalid-multiplier", `quantity must be a positive integer, got ${quantity}`);
    }
    return new Money(this.cents * quantity, this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainError(
        "money.currency-mismatch",
        `cannot combine ${this.currency} with ${other.currency}`,
      );
    }
  }
}

export interface LineItemInput {
  sku: string;
  unitPrice: Money;
  quantity: number;
}

export interface LineItem {
  sku: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

const MAX_ITEMS = 100;

export class Order {
  public readonly currency: string;
  private readonly lineItems: LineItem[] = [];
  private state: "editable" | "placed" = "editable";

  /** Use Order.create() — construction is validated. */
  private constructor(currency: string) {
    this.currency = currency;
  }

  static create(currency: string): Order {
    // Validate via the value object's rules (3-letter uppercase).
    Money.ofCents(0, currency);
    return new Order(currency);
  }

  get items(): ReadonlyArray<LineItem> {
    return this.lineItems;
  }

  get total(): Money {
    const zero = Money.ofCents(0, this.currency);
    return this.lineItems.reduce((acc, item) => acc.add(item.lineTotal), zero);
  }

  addLineItem(input: LineItemInput): void {
    if (this.state !== "editable") {
      throw new DomainError("order.frozen", `cannot modify an order that is ${this.state}`);
    }
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new DomainError("order.invalid-quantity", `quantity must be a positive integer`);
    }
    if (input.unitPrice.currency !== this.currency) {
      throw new DomainError(
        "order.currency-mismatch",
        `item currency ${input.unitPrice.currency} != order currency ${this.currency}`,
      );
    }
    if (this.lineItems.length >= MAX_ITEMS) {
      throw new DomainError("order.item-limit", `orders are capped at ${MAX_ITEMS} line items`);
    }

    this.lineItems.push({
      sku: input.sku,
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      lineTotal: input.unitPrice.multiplyBy(input.quantity),
    });
  }

  place(): void {
    if (this.lineItems.length === 0) {
      throw new DomainError("order.empty", "cannot place an order with no items");
    }
    this.state = "placed";
  }
}
