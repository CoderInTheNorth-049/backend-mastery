// ── Part 1: typed API client ─────────────────────────────────────────────

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

interface RequestResult<T> {
  response: Response;
  body: T;
}

function errorFromFetchFailure(error: unknown, timeoutMs?: number): ApiError {
  const name = (error as DOMException | undefined)?.name;
  if (name === "TimeoutError" || name === "AbortError") {
    return new ApiError("timeout", `request timed out after ${timeoutMs}ms`);
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new ApiError("network", `request failed: ${detail}`);
}

export class PaymentsApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly options: ClientOptions = {},
  ) {}

  private async send<T>(
    method: string,
    path: string,
    expectedStatus: number,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const { timeoutMs } = this.options;
    const timer = timeoutMs !== undefined ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(this.options.apiKey !== undefined
            ? { "x-api-key": this.options.apiKey }
            : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
    } catch (error) {
      throw errorFromFetchFailure(error, timeoutMs);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }

    // Parse ONCE; malformed JSON on ANY status is a malformed server response.
    const raw = await response.text();
    let parsed: unknown;
    try {
      parsed = raw.length > 0 ? JSON.parse(raw) : null;
    } catch {
      throw new ApiError("server", `malformed JSON response from provider`, response.status);
    }

    if (!response.ok) throw this.errorForStatus(response.status, parsed);

    if (response.status !== expectedStatus) {
      throw new ApiError(
        "server",
        `unexpected status ${response.status}, expected ${expectedStatus}`,
        response.status,
      );
    }

    return parsed as T;
  }

  private errorForStatus(status: number, parsedBody: unknown): ApiError {
    if (status === 404) return new ApiError("not-found", "resource not found", status);

    const message =
      typeof parsedBody === "object" && parsedBody !== null && "error" in parsedBody
        ? String((parsedBody as { error: { message?: unknown } }).error?.message ??
            JSON.stringify(parsedBody))
        : JSON.stringify(parsedBody);

    if (status === 400 || status === 422) return new ApiError("validation", message, status);
    return new ApiError("server", `${status}: ${message}`, status);
  }

  async createCharge(input: ChargeInput): Promise<Charge> {
    return this.send<Charge>("POST", BASE_PATH, 201, input);
  }

  async getCharge(id: string): Promise<Charge> {
    return this.send<Charge>("GET", `${BASE_PATH}/${id}`, 200);
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

export function verifyContract(
  actual: { status: number; body: unknown },
  contract: Contract,
): ContractResult {
  const violations: string[] = [];

  if (actual.status !== contract.status) {
    violations.push(`status: expected ${contract.status}, got ${actual.status}`);
  }

  walk(contract.body, actual.body, "body", violations);

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

function isNestedContract(spec: FieldSpec | ContractBody): spec is ContractBody {
  // A FieldSpec ALWAYS declares `type`; anything without it is a nested
  // contract object (whose own body entries recurse the same way).
  return !("type" in spec);
}

function walk(
  specFields: ContractBody,
  actualValue: unknown,
  path: string,
  violations: string[],
): void {
  if (typeof actualValue !== "object" || actualValue === null) {
    violations.push(`${path}: not an object`);
    return;
  }
  const record = actualValue as Record<string, unknown>;

  for (const [field, spec] of Object.entries(specFields)) {
    const fieldPath = `${path}.${field}`;
    const value = record[field];

    if (isNestedContract(spec)) {
      // A nested contract's VALUE is itself the body-map — recurse into it.
      walk(spec, value ?? {}, fieldPath, violations);
      continue;
    }

    if (value === undefined || value === null) {
      if (spec.required !== false) violations.push(`${fieldPath}: missing`);
      continue;
    }
    if (typeof value !== spec.type) {
      violations.push(`${fieldPath}: expected ${spec.type}, got ${typeof value}`);
    }
  }
}
