export interface OrderItem {
  sku: string;
  qty: number;
}

// Money crosses service boundaries as integer cents only. Floats are banned
// because 0.1 + 0.2 !== 0.3 and reconciliation disputes are worse than the fix.
export function assertCents(value: number, label = "amount"): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents, got ${value}`);
  }
  return value;
}

export function sumItems(
  items: OrderItem[],
  priceMapCents: Readonly<Record<string, number>>,
): number {
  return items.reduce((total, item) => {
    const unitCents = priceMapCents[item.sku];
    if (unitCents === undefined) {
      throw new Error(`unknown sku: ${item.sku}`);
    }
    assertCents(unitCents, `price[${item.sku}]`);
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new Error(`qty for ${item.sku} must be a positive integer, got ${item.qty}`);
    }
    return assertCents(total + unitCents * item.qty, "order total");
  }, 0);
}
