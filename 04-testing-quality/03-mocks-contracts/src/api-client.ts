// ── Part 1: typed API client (graded via MSW in api.spec.ts) ─────────────

export type ApiErrorCode =
  | "validation"
  | "not-found"
  | "server"
  | "timeout"
  | "network";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface ChargeInput {
  amount_cents: number;
  currency: string;
  customer: { id: number; email: string };
  source: string;
}

export interface Charge {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  customer: { id: number; email: string };
}

export interface ClientOptions {
  timeoutMs?: number;
  apiKey?: string;
}

const BASE_PATH = "/v1/charges";

export class PaymentsApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly options: ClientOptions = {},
  ) {}

  async createCharge(input: ChargeInput): Promise<Charge> {
    throw new Error("TODO: implement createCharge");
  }

  async getCharge(id: string): Promise<Charge> {
    throw new Error("TODO: implement getCharge");
  }
}

// ── Part 2: consumer-driven contract verification ────────────────────────

export type FieldType = "string" | "number" | "boolean";
export interface FieldSpec {
  type: FieldType;
  required?: boolean;
}
export type ContractBody = { [field: string]: FieldSpec | ContractBody };
export interface Contract {
  status: number;
  body: ContractBody;
}
export type ContractResult = { ok: true } | { ok: false; violations: string[] };

/**
 * Tolerant-reader verification:
 *   - status must match exactly
 *   - known required fields present with the declared primitive type
 *   - nested contracts recurse with dotted paths ("body.customer.id")
 *   - UNKNOWN fields are ignored
 * Violation message formats are contractual — see ../assignment.md.
 */
export function verifyContract(
  actual: { status: number; body: unknown },
  contract: Contract,
): ContractResult {
  throw new Error("TODO: implement verifyContract");
}
