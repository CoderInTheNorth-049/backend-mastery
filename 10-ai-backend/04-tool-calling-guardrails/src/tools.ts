// ── Tool registry, validation, guarded dispatch ──────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export type ParamType = "string" | "number" | "boolean";

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, ParamType>;
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface RegistryLimits {
  /** Max tool executions before the guardrail trips. default 8 */
  maxCalls?: number;
}

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailError";
  }
}

export class ToolRegistry {
  register(def: ToolDef): void {
    throw new Error("TODO: implement register (duplicate names throw)");
  }

  has(name: string): boolean {
    throw new Error("TODO: implement has");
  }

  list(): string[] {
    throw new Error("TODO: names in registration order");
  }

  get(name: string): ToolDef | undefined {
    throw new Error("TODO: implement get");
  }
}

export type ValidationResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; errors: string[] };

/**
 * Validate a model-produced argument bag against the tool's schema:
 *   - every declared parameter must be present with the declared primitive type
 *   - UNKNOWN keys are errors too
 * Error strings are contractual; see ../assignment.md for exact formats.
 */
export function validateArgs(
  def: Pick<ToolDef, "name" | "parameters">,
  args: Record<string, unknown>,
): ValidationResult {
  throw new Error("TODO: implement validateArgs");
}

/** Validate → execute. Validation failures and unknown tools never run code. */
export async function executeToolCall(
  registry: ToolRegistry,
  call: ToolCall,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  throw new Error("TODO: implement executeToolCall");
}

/**
 * Registry + counter in one object. When maxCalls is reached, `execute`
 * throws GuardrailError WITHOUT running the tool.
 */
export function createGuardedExecutor(registry: ToolRegistry, limits?: RegistryLimits): {
  execute(call: ToolCall): Promise<{ ok: true; result: unknown } | { ok: false; error: string }>;
  callsUsed(): number;
} {
  throw new Error("TODO: implement createGuardedExecutor");
}
