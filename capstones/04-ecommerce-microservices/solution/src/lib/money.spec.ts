import { describe, expect, it } from "vitest";
import { sumItems } from "./money";

describe("money.sumItems", () => {
  it("sums line items in integer cents", () => {
    const prices = { "SKU-1": 1500, "SKU-2": 24000 };
    expect(sumItems([{ sku: "SKU-1", qty: 2 }, { sku: "SKU-2", qty: 1 }], prices)).toBe(27000);
    expect(sumItems([], prices)).toBe(0);
  });

  it("rejects fractional money - floats never touch the ledger", () => {
    expect(() => sumItems([{ sku: "A", qty: 1 }], { A: 10.5 })).toThrow(/integer/);
    expect(() => sumItems([{ sku: "A", qty: 1.5 }], { A: 100 })).toThrow(/positive integer/);
  });

  it("rejects unknown skus instead of pricing them at zero", () => {
    expect(() => sumItems([{ sku: "GHOST", qty: 1 }], { A: 100 })).toThrow(/unknown sku/);
  });
});
