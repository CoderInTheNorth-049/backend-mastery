// Self-contained answer key: no imports from ../src (redirector-safe).

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
  maxCalls?: number;
}

export class GuardrailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailError";
  }
}

export class ToolRegistry {
  private defs = new Map<string, ToolDef>();
  private order: string[] = [];

  register(def: ToolDef): void {
    if (this.defs.has(def.name)) {
      throw new Error(`tool already registered: ${def.name}`);
    }
    this.defs.set(def.name, def);
    this.order.push(def.name);
  }

  has(name: string): boolean {
    return this.defs.has(name);
  }

  list(): string[] {
    return [...this.order];
  }

  get(name: string): ToolDef | undefined {
    return this.defs.get(name);
  }
}

function matchesType(value: unknown, expected: ParamType): boolean {
  switch (expected) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
  }
}

/**
 * Strict validation: every declared parameter present + typed; unknown keys
 * rejected. Model output is untrusted input — fail closed.
 */
export function validateArgs(
  def: Pick<ToolDef, "name" | "parameters">,
  args: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  for (const [param, expected] of Object.entries(def.parameters)) {
    const value = args[param];
    if (value === undefined) {
      errors.push(`${param}: missing`);
    } else if (!matchesType(value, expected)) {
      errors.push(`${param}: expected ${expected}, got ${typeof value}`);
    }
  }

  const known = new Set(Object.keys(def.parameters));
  for (const key of Object.keys(args)) {
    if (!known.has(key)) {
      errors.push(`${key}: unknown parameter`);
    }
  }

  return errors.length === 0 ? { ok: true, args } : { ok: false, errors };
}

export type ValidationResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; errors: string[] };

/** Validate → execute. Validation failures and unknown tools never run code. */
export async function executeToolCall(
  registry: ToolRegistry,
  call: ToolCall,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  const def = registry.get(call.name);
  if (!def) {
    return { ok: false, error: `unknown tool: ${call.name}` };
  }

  const validation = validateArgs(def, call.arguments);
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join("; ") };
  }

  const result = await def.execute(validation.args);
  return { ok: true, result };
}

/**
 * Registry + execution counter. The counter is a SAFETY BRAKE against
 * model loops — when it trips, tools stop running and a GuardrailError
 * surfaces to the calling loop.
 */
export function createGuardedExecutor(registry: ToolRegistry, limits?: RegistryLimits) {
  const maxCalls = limits?.maxCalls ?? 8;
  let used = 0;

  return {
    callsUsed(): number {
      return used;
    },

    async execute(call: ToolCall) {
      if (used >= maxCalls) {
        throw new GuardrailError(
          `tool-call limit reached (${maxCalls}) — refusing further executions`,
        );
      }
      used++;
      return executeToolCall(registry, call);
    },
  };
}
