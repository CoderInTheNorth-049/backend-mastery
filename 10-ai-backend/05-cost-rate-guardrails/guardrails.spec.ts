import { describe, expect, it } from "vitest";
import {
  BudgetLedger,
  estimateRequestCost,
  estimateTokens,
} from "./src/guardrails";

describe("estimateTokens", () => {
  it("ceil(chars / 4)", () => {
    expect(estimateTokens("hell")).toBe(1); // 4 chars
    expect(estimateTokens("hello")).toBe(2); // 5 chars → 2 tokens
    expect(estimateTokens("a".repeat(17))).toBe(5);
  });

  it("empty string costs nothing", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("estimateRequestCost", () => {
  const pricing = { inputPer1k: 0.03, outputPer1k: 0.06 };

  it("sums input and output token costs", () => {
    expect(
      estimateRequestCost({ inputTokens: 100, outputTokens: 200 }, pricing),
    ).toBeCloseTo(0.015, 6); // 0.003 + 0.012
  });

  it("output tokens dominate at equal totals (they're priced higher)", () => {
    // Same 1000 total tokens, opposite splits:
    const outputHeavy = estimateRequestCost({ inputTokens: 200, outputTokens: 800 }, pricing);
    const inputHeavy = estimateRequestCost({ inputTokens: 800, outputTokens: 200 }, pricing);

    expect(outputHeavy).toBeCloseTo(0.054, 6);
    expect(inputHeavy).toBeCloseTo(0.036, 6);
    expect(outputHeavy).toBeGreaterThan(inputHeavy);
  });

  it("rounds to 6 decimals (no FP dust in ledgers)", () => {
    const cost = estimateRequestCost({ inputTokens: 1, outputTokens: 1 }, pricing);
    expect(cost).toBe(0.00009);
    expect(String(cost).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(6);
  });
});

describe("BudgetLedger", () => {
  it("unknown tenants are denied by default ($0 limit)", () => {
    const ledger = new BudgetLedger({});
    expect(ledger.canSpend("ghost", 0.01)).toBe(false);
  });

  it("allows spending within limits and tracks totals", () => {
    const ledger = new BudgetLedger({ acme: 10 });
    expect(ledger.spend("acme", 4)).toEqual({ ok: true, spent: 4, remaining: 6 });
    expect(ledger.spent("acme")).toBe(4);
  });

  it("fails closed at the boundary: charge that would exceed is refused unrecorded", () => {
    const ledger = new BudgetLedger({ acme: 10 });
    ledger.spend("acme", 9);

    const blocked = ledger.spend("acme", 2); // would hit 11 > 10
    expect(blocked.ok).toBe(false);
    expect(ledger.spent("acme")).toBe(9); // refused spend NOT recorded

    const exactFit = ledger.spend("acme", 1); // exactly 10 is allowed
    expect(exactFit).toEqual({ ok: true, spent: 10, remaining: 0 });
  });

  it("tenants are isolated ledgers", () => {
    const ledger = new BudgetLedger({ big: 100, small: 1 });
    ledger.spend("big", 50);

    expect(ledger.canSpend("small", 0.5)).toBe(true); // unaffected by 'big'
    expect(ledger.spent("small")).toBe(0);
  });

  it("defaultLimit option covers unlisted tenants", () => {
    const ledger = new BudgetLedger({ premium: 100 }, { defaultLimit: 2 });
    expect(ledger.canSpend("random-user", 1)).toBe(true);
    expect(ledger.canSpend("random-user", 99)).toBe(false);
    expect(ledger.canSpend("premium", 99)).toBe(true); // explicit limit wins
  });
});
