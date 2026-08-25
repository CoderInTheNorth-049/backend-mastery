// ── Token estimation, cost math, tenant budgets ──────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

/** ~4 chars ≈ 1 token, rounded UP. Empty string → 0. */
export function estimateTokens(text: string): number {
  throw new Error("TODO: implement estimateTokens");
}

export interface UsageCost {
  inputTokens: number;
  outputTokens: number;
}

export interface Pricing {
  /** dollars per 1k tokens */
  inputPer1k: number;
  outputPer1k: number;
}

/**
 * Dollars for a request: input + output token costs summed.
 * Result rounded to 6 decimal places (avoid FP dust in ledgers).
 */
export function estimateRequestCost(usage: UsageCost, pricing: Pricing): number {
  throw new Error("TODO: implement estimateRequestCost");
}

/**
 * Fail-closed per-tenant ledger.
 *   canSpend(tenant, usd) → false when spent + usd would exceed the limit
 *   spend(tenant, usd)    → { ok:false } without recording when blocked
 * Unknown tenants have limit $0 unless configured — deny by default.
 */
export class BudgetLedger {
  constructor(limits: Record<string, number>, options?: { defaultLimit?: number }) {
    throw new Error("TODO: store limits + a copy-on-write spend map");
  }

  canSpend(tenant: string, usd: number): boolean {
    throw new Error("TODO: fail-closed check");
  }

  spend(tenant: string, usd: number): { ok: boolean; spent: number; remaining: number } {
    throw new Error("TODO: record when allowed; refuse when over");
  }

  spent(tenant: string): number {
    throw new Error("TODO: total recorded spend (0 for unknown tenants)");
  }
}
