import { describe, expect, it } from "vitest";
import { DomainError, Money, Order } from "./src/order";

const USD = "USD";
const EUR = "EUR";

function money(cents: number): Money {
  return Money.ofCents(cents, USD);
}

describe("Money — immutable value object", () => {
  it("constructs from non-negative integer cents + 3-letter currency", () => {
    expect(Money.ofCents(1999, USD).cents).toBe(1999);
    expect(() => Money.ofCents(-1, USD)).toThrow(DomainError);
    expect(() => Money.ofCents(1.5, USD)).toThrow(DomainError);
    expect(() => Money.ofCents(100, "us")).toThrow(DomainError); // not 3 letters
    expect(() => Money.ofCents(100, "USDD")).toThrow(DomainError);
  });

  it("add returns a NEW instance; operands unchanged", () => {
    const a = money(100);
    const b = money(250);
    const c = a.add(b);

    expect(c.cents).toBe(350);
    expect(a.cents).toBe(100);
    expect(b.cents).toBe(250);
    expect(c).not.toBe(a);
  });

  it("add refuses cross-currency math", () => {
    const usd = Money.ofCents(100, USD);
    const eur = Money.ofCents(100, EUR);
    expect(() => usd.add(eur)).toThrow(DomainError);
  });

  it("multiplyBy requires positive integers", () => {
    expect(money(150).multiplyBy(3).cents).toBe(450);
    expect(() => money(150).multiplyBy(0)).toThrow(DomainError);
    expect(() => money(150).multiplyBy(-2)).toThrow(DomainError);
    expect(() => money(150).multiplyBy(1.5)).toThrow(DomainError);
  });

  it("equality is by value", () => {
    expect(money(500).equals(money(500))).toBe(true);
    expect(money(500).equals(Money.ofCents(500, EUR))).toBe(false);
    expect(money(500).equals(money(499))).toBe(false);
  });
});

describe("Order aggregate", () => {
  it("starts empty with zero total in its currency", () => {
    const order = Order.create(USD);
    expect(order.items).toHaveLength(0);
    expect(order.total.equals(money(0))).toBe(true);
  });

  it("addLineItem appends and keeps total consistent automatically", () => {
    const order = Order.create(USD);
    order.addLineItem({ sku: "SKU-1", unitPrice: money(999), quantity: 2 });
    order.addLineItem({ sku: "SKU-2", unitPrice: money(50), quantity: 1 });

    expect(order.total.cents).toBe(2048);
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toMatchObject({ sku: "SKU-1", lineTotal: { cents: 1998 } });
  });

  it("rejects invalid quantities with domain errors", () => {
    const order = Order.create(USD);
    for (const bad of [0, -1, 2.5]) {
      expect(() =>
        order.addLineItem({ sku: "S", unitPrice: money(100), quantity: bad as number }),
      ).toThrow(DomainError);
    }
  });

  it("rejects cross-currency items", () => {
    const order = Order.create(USD);
    expect(() =>
      order.addLineItem({
        sku: "S",
        unitPrice: Money.ofCents(100, EUR),
        quantity: 1,
      }),
    ).toThrow(DomainError);
  });

  it("caps orders at 100 distinct line items", () => {
    const order = Order.create(USD);
    for (let i = 0; i < 100; i++) {
      order.addLineItem({ sku: `S${i}`, unitPrice: money(1), quantity: 1 });
    }
    expect(() =>
      order.addLineItem({ sku: "S101", unitPrice: money(1), quantity: 1 }),
    ).toThrow(/100/);
  });

  it("place() requires ≥1 item and freezes further edits", () => {
    const order = Order.create(USD);
    expect(() => order.place()).toThrow(DomainError);

    order.addLineItem({ sku: "S", unitPrice: money(10), quantity: 1 });
    order.place();

    expect(() =>
      order.addLineItem({ sku: "S2", unitPrice: money(10), quantity: 1 }),
    ).toThrow(DomainError);
  });
});
