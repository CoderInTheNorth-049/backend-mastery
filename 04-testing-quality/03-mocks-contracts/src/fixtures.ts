// ── PROVIDED: provider fixtures for contract verification ────────────────
// These simulate what the "payments provider" actually returns. Your
// verifyContract() grades them against chargeContract.

export interface ProviderResponse {
  status: number;
  body: unknown;
}

import type { ContractBody } from "./api-client";

// Nested contracts get their own annotated constant — TypeScript's
// excess-property check can't infer the union member otherwise.
const customerContract: ContractBody = {
  id: { type: "number", required: true },
  email: { type: "string", required: true },
};

export const chargeContract: { status: number; body: ContractBody } = {
  status: 201,
  body: {
    id: { type: "string", required: true },
    status: { type: "string", required: true },
    amount_cents: { type: "number", required: true },
    currency: { type: "string", required: true },
    customer: customerContract,
  },
};

const happyBody = {
  id: "ch_123",
  status: "succeeded",
  amount_cents: 1999,
  currency: "usd",
  customer: { id: 7, email: "ada@x.io" },
};

export const chargeResponses = {
  happy: { status: 201, body: happyBody },

  wrongStatus: { status: 202, body: happyBody },

  amountAsString: {
    status: 201,
    body: { ...happyBody, amount_cents: "1999" },
  },

  missingEmail: {
    status: 201,
    body: { ...happyBody, customer: { id: 7 } },
  },

  extraFieldsOk: {
    status: 201,
    body: { ...happyBody, promo_code: "LAUNCH", internal_score: 42 },
  },
} satisfies Record<string, ProviderResponse>;
