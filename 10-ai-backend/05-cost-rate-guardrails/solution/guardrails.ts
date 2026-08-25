export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
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

export function estimateRequestCost(usage: UsageCost, pricing: Pricing): number {
  const input = (usage.inputTokens / 1_000) * pricing.inputPer1k;
  const output = (usage.outputTokens / 1_000) * pricing.outputPer1k;
  return Number((input + output).toFixed(6));
}

export class BudgetLedger {
  private readonly limits: Record<string, number>;
  private readonly defaultLimit: number;
  private spendByTenant = new Map<string, number>();

  constructor(limits: Record<string, number>, options?: { defaultLimit?: number }) {
    this.limits = { ...limits };
    // Copy-on-write: callers can't mutate our limits map from outside.
    this.defaultLimit = options?.defaultLimit ?? 0;
  }

  limitFor(tenant: string): number {
    return this.limits[tenant] ?? this.defaultLimit;
  }

  spent(tenant: string): number {
    return this.spendByTenant.get(tenant) ?? 0;
  }

  /** Fail-closed: false whenever the charge would exceed the tenant's cap. */
  canSpend(tenant: string, usd: number): boolean {
    return this.spent(tenant) + usd <= this.limitFor(tenant);
  }

  spend(
    tenant: string,
    usd: number,
  ): { ok: boolean; spent: number; remaining: number } {
    const limit = this.limitFor(tenant);

    if (!this.canSpend(tenant, usd)) {
      return { ok: false, spent: this.spent(tenant), remaining: Math.max(0, limit - this.spent(tenant)) };
    }

    const spent = this.spent(tenant) + usd;
    this.spendByTenant.set(tenant, spent);
    return { ok: true, spent, remaining: Math.max(0, limit - spent) };
  }
}
