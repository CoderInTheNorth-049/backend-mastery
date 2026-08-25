# Topic: Cost & rate guardrails — AI features that can't bankrupt you

> **Goal:** Every LLM call costs money proportional to TEXT LENGTH. You'll implement token estimation, per-request cost math, and a tenant budget ledger that fails closed — the three lines of defense between a viral demo and a five-figure invoice.

## Beginner-friendly picks

- 📝 [OpenAI pricing page](https://openai.com/pricing) (read free) — per-1k-token model pricing is the shape of ALL provider pricing
- 🎥 YouTube search: **“LLM token limits explained”** — tokens ≠ words ≠ chars, visualized

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Tokens | models read sub-word TOKENS; ~4 chars ≈ 1 token for English — estimation, not accounting | [OpenAI — tokens](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them) |
| Cost math | price per 1k INPUT tokens + per 1k OUTPUT tokens; output usually 3–5× pricier | pricing page above |
| Per-tenant budgets | multi-tenant platforms need PER-TENANT ledgers: spent vs limit, checked BEFORE the call | your ledger |
| Fail-closed checks | `canSpend()` runs pre-call; post-call recording updates the ledger. Over-limit ⇒ refuse or downgrade | your assignment |
| Tiered limits | free/pro/enterprise tiers = different monthly caps + rate ceilings on the same code path | your stretch |

## Keep in mind

- **Estimate BEFORE calling** (block over-budget), **record AFTER responding** (actuals). Two different numbers, two different jobs.
- **Char-based estimation undercounts non-English and code** — pad by 20–30% for safety margins in enforcement paths.
- **Ledgers must be shared state** (Redis/DB in prod). An in-process Map only works because this topic's tests are single-instance — know why it's teaching-only.
- **Rate limiting ≠ cost budgeting**: one stops REQUEST velocity, the other stops SPEND. Big tenants need both.
- Log every refusal with tenant + estimate — refusals are support tickets waiting to happen.

## Self-check quiz

<details><summary>1. Prompt 400 chars, completion 800 chars, $0.03/1k input, $0.06/1k output. Cost?</summary>
Tokens: 100 in / 200 out → 100×0.03/1000 + 200×0.06/1000 = $0.003 + $0.012 = <b>$0.015</b>. Output dominates — cap max_tokens first.</details>

<details><summary>2. Why check budget before AND record after, instead of once?</summary>
Pre-check blocks tenants already over limit (fail-closed); post-recording tracks actual spend including THIS call's real token count. Estimate gates, actuals account.</details>

<details><summary>3. Tenant hits limit mid-month. Three product responses?</summary>
(1) hard-stop with upgrade CTA; (2) degrade to cheaper/smaller model; (3) grace buffer with notification. Pick deliberately — silence isn't an option.</details>

## Assignment

[assignment.md](assignment.md) — implement `estimateTokens`, `estimateRequestCost`, and `BudgetLedger` with fail-closed spending. Pure logic, zero network, fully deterministic.
